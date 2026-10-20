import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { applyOverrides } from "./apply-overrides";

export const TRANSLATIONS_TAG = "translations";

// Cached per locale (arguments are part of the cache key) until the tag is revalidated
export const getMergedMessages = unstable_cache(
  async (locale: string) => {
    const base = (await import(`../../localizations/${locale}.json`)).default as Record<
      string,
      unknown
    >;
    const overrides = await prisma.translation.findMany({
      where: { locale, publishedValue: { not: null } },
      select: { namespace: true, key: true, publishedValue: true },
    });
    return applyOverrides(base, overrides);
  },
  ["merged-messages"],
  { tags: [TRANSLATIONS_TAG] },
);
