import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { loadBaseMessages } from "./load-base";
import { addCustomKeys, applyOverrides } from "./apply-overrides";

export const TRANSLATIONS_TAG = "translations";

// Cached per locale (arguments are part of the cache key) until the tag is revalidated.
// A locale only ever sees its own texts: a missing text surfaces as its key,
// never as another language's text, so gaps are easy to spot.
export const getMergedMessages = unstable_cache(
  async (locale: string) => {
    const rows = await prisma.translation.findMany({
      where: { locale, publishedValue: { not: null } },
      select: { namespace: true, key: true, publishedValue: true },
    });

    const customEntries = rows.flatMap((row) =>
      row.publishedValue === null
        ? []
        : [{ namespace: row.namespace, key: row.key, value: row.publishedValue }],
    );

    const base = await loadBaseMessages(locale);
    return addCustomKeys(applyOverrides(base, rows), customEntries);
  },
  ["merged-messages"],
  { tags: [TRANSLATIONS_TAG] },
);
