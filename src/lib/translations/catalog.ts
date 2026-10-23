import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { flattenMessages } from "./flatten";
import { loadBaseMessages } from "@/i18n/load-base";
export { loadBaseMessages };

export type TranslationCell = {
  base: string | null; // value from the bundled JSON, null if the key is missing in this locale
  published: string | null;
  draft: string | null;
};

export type TranslationRow = {
  id: string; // "namespace.key"
  namespace: string;
  key: string;
  cells: Record<string, TranslationCell>;
  hasDraft: boolean;
  // True when no locale JSON contains the key: it was created from the panel
  isCustom: boolean;
};

export async function keyExistsInBase(
  locale: string,
  namespace: string,
  key: string,
): Promise<boolean> {
  const entries = flattenMessages(await loadBaseMessages(locale));
  return entries.some((e) => e.namespace === namespace && e.key === key);
}

// True when at least one locale JSON contains the key
export async function keyExistsInAnyBase(namespace: string, key: string): Promise<boolean> {
  const results = await Promise.all(
    routing.locales.map((locale) => keyExistsInBase(locale, namespace, key)),
  );
  return results.some(Boolean);
}

function emptyCells(): Record<string, TranslationCell> {
  const cells: Record<string, TranslationCell> = {};
  for (const locale of routing.locales) {
    cells[locale] = { base: null, published: null, draft: null };
  }
  return cells;
}

// Builds the full catalog: every key found in any locale JSON plus custom keys
// from the DB, merged with overrides.
export async function getTranslationRows(): Promise<TranslationRow[]> {
  const locales = routing.locales;

  const [bases, overrides] = await Promise.all([
    Promise.all(
      locales.map(async (locale) => {
        return [locale, flattenMessages(await loadBaseMessages(locale))] as const;
      }),
    ),
    prisma.translation.findMany({
      select: {
        locale: true,
        namespace: true,
        key: true,
        draftValue: true,
        publishedValue: true,
      },
    }),
  ]);

  const rows = new Map<string, TranslationRow>();

  for (const [locale, entries] of bases) {
    for (const { namespace, key, value } of entries) {
      const id = `${namespace}.${key}`;
      let row = rows.get(id);
      if (!row) {
        row = { id, namespace, key, cells: emptyCells(), hasDraft: false, isCustom: false };
        rows.set(id, row);
      }
      const cell = row.cells[locale];
      if (cell) cell.base = value;
    }
  }

  for (const o of overrides) {
    // Rows of a locale that is no longer configured are ignored
    if (!(locales as readonly string[]).includes(o.locale)) continue;

    const id = `${o.namespace}.${o.key}`;
    let row = rows.get(id);
    if (!row) {
      // Not in any JSON file: a custom key created from the panel
      row = {
        id,
        namespace: o.namespace,
        key: o.key,
        cells: emptyCells(),
        hasDraft: false,
        isCustom: true,
      };
      rows.set(id, row);
    }

    const cell = row.cells[o.locale];
    if (!cell) continue;

    cell.published = o.publishedValue;
    cell.draft = o.draftValue;
    if (o.draftValue !== null) row.hasDraft = true;
  }

  return [...rows.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export async function countDrafts(): Promise<number> {
  return prisma.translation.count({ where: { draftValue: { not: null } } });
}

// Builds a lookup that answers: "which text defines the placeholders of this key?"
// JSON keys: the default locale's JSON text (what the code passes arguments for),
// falling back to any other locale's JSON. Custom keys: the default locale's own
// text, except for the default locale itself, which defines the placeholders.
export async function createReferenceResolver() {
  const defaultLocale = routing.defaultLocale;
  const ordered = [defaultLocale, ...routing.locales.filter((code) => code !== defaultLocale)];

  const fromJson = new Map<string, string>();
  for (const code of ordered) {
    for (const entry of flattenMessages(await loadBaseMessages(code))) {
      const id = `${entry.namespace}.${entry.key}`;
      if (!fromJson.has(id)) fromJson.set(id, entry.value);
    }
  }

  const defaultRows = await prisma.translation.findMany({
    where: { locale: defaultLocale },
    select: { namespace: true, key: true, draftValue: true, publishedValue: true },
  });
  const customDefaults = new Map<string, string>();
  for (const row of defaultRows) {
    const text = row.draftValue ?? row.publishedValue;
    if (text !== null) customDefaults.set(`${row.namespace}.${row.key}`, text);
  }

  return (namespace: string, key: string, locale: string): string | null => {
    const id = `${namespace}.${key}`;
    const jsonText = fromJson.get(id);
    if (jsonText !== undefined) return jsonText;
    if (locale === defaultLocale) return null;
    return customDefaults.get(id) ?? null;
  };
}
