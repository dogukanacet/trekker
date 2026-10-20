import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { flattenMessages } from "./flatten";

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
};

export async function loadBaseMessages(locale: string): Promise<Record<string, unknown>> {
  return (await import(`../../../localizations/${locale}.json`)).default as Record<string, unknown>;
}

export async function keyExistsInBase(
  locale: string,
  namespace: string,
  key: string,
): Promise<boolean> {
  const entries = flattenMessages(await loadBaseMessages(locale));
  return entries.some((e) => e.namespace === namespace && e.key === key);
}

// Builds the full catalog: every key found in any locale JSON, merged with DB overrides.
// Orphan overrides (key no longer in JSON) are ignored.
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
        row = { id, namespace, key, cells: {}, hasDraft: false };
        for (const l of locales) {
          row.cells[l] = { base: null, published: null, draft: null };
        }
        rows.set(id, row);
      }
      const cell = row.cells[locale];
      if (cell) cell.base = value;
    }
  }

  for (const o of overrides) {
    const row = rows.get(`${o.namespace}.${o.key}`);
    const cell = row?.cells[o.locale];
    if (!row || !cell || cell.base === null) continue;
    cell.published = o.publishedValue;
    cell.draft = o.draftValue;
    if (o.draftValue !== null) row.hasDraft = true;
  }

  return [...rows.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export async function countDrafts(): Promise<number> {
  return prisma.translation.count({ where: { draftValue: { not: null } } });
}
