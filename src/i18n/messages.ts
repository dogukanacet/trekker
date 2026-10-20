import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { routing } from "./routing";
import { addCustomKeys, applyOverrides } from "./apply-overrides";

export const TRANSLATIONS_TAG = "translations";

// Cached per locale (arguments are part of the cache key) until the tag is revalidated
export const getMergedMessages = unstable_cache(
  async (locale: string) => {
    const base = (await import(`../../localizations/${locale}.json`)).default as Record<
      string,
      unknown
    >;

    // The default locale is loaded too: custom keys fall back to its text
    const locales = locale === routing.defaultLocale ? [locale] : [locale, routing.defaultLocale];
    const rows = await prisma.translation.findMany({
      where: { locale: { in: locales }, publishedValue: { not: null } },
      select: { locale: true, namespace: true, key: true, publishedValue: true },
    });

    const own = rows.filter((row) => row.locale === locale);
    const merged = applyOverrides(base, own);

    // Default-locale rows go in first so this locale's own rows win
    const custom = new Map<string, { namespace: string; key: string; value: string }>();
    for (const row of [...rows.filter((r) => r.locale !== locale), ...own]) {
      if (row.publishedValue === null) continue;
      custom.set(`${row.namespace}.${row.key}`, {
        namespace: row.namespace,
        key: row.key,
        value: row.publishedValue,
      });
    }

    return addCustomKeys(merged, [...custom.values()]);
  },
  ["merged-messages"],
  { tags: [TRANSLATIONS_TAG] },
);
