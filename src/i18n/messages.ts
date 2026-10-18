import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const TRANSLATIONS_TAG = "translations";

type Messages = Record<string, unknown>;

type Override = {
  namespace: string;
  key: string;
  publishedValue: string | null;
};

// Overrides never create new keys: a path must already exist as a string
// in the base JSON, otherwise it is ignored.
export function applyOverrides(base: Messages, overrides: Override[]): Messages {
  // Clone so the shared JSON module object is never mutated
  const result = structuredClone(base);

  for (const { namespace, key, publishedValue } of overrides) {
    if (publishedValue === null) continue;

    const path = [namespace, ...key.split(".")];
    const last = path.at(-1);
    if (!last) continue;

    let node: unknown = result;
    for (const segment of path.slice(0, -1)) {
      if (typeof node !== "object" || node === null || !Object.hasOwn(node, segment)) {
        node = undefined;
        break;
      }
      node = (node as Messages)[segment];
    }

    if (
      typeof node === "object" &&
      node !== null &&
      Object.hasOwn(node, last) &&
      typeof (node as Messages)[last] === "string"
    ) {
      (node as Messages)[last] = publishedValue;
    }
  }

  return result;
}

// Cached per locale (arguments are part of the cache key) until the tag is revalidated
export const getMergedMessages = unstable_cache(
  async (locale: string): Promise<Messages> => {
    const base = (await import(`../../localizations/${locale}.json`)).default as Messages;
    const overrides = await prisma.translation.findMany({
      where: { locale, publishedValue: { not: null } },
      select: { namespace: true, key: true, publishedValue: true },
    });
    return applyOverrides(base, overrides);
  },
  ["merged-messages"],
  { tags: [TRANSLATIONS_TAG] },
);
