import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { routing } from "./routing";

export const LANGUAGES_TAG = "languages";

// Used for languages that have no Language row yet
const ENABLED_BY_DEFAULT = ["tr", "en"];

function defaultEnabled(): string[] {
  return routing.locales.filter(
    (code) => code === routing.defaultLocale || ENABLED_BY_DEFAULT.includes(code),
  );
}

const getEnabledLocalesCached = unstable_cache(
  async (): Promise<string[]> => {
    const rows = await prisma.language.findMany({ select: { code: true, enabled: true } });
    const flags = new Map(rows.map((row) => [row.code, row.enabled]));
    // The default language can never be switched off
    return routing.locales.filter(
      (code) =>
        code === routing.defaultLocale || (flags.get(code) ?? ENABLED_BY_DEFAULT.includes(code)),
    );
  },
  ["enabled-locales"],
  { tags: [LANGUAGES_TAG] },
);

export async function getEnabledLocales(): Promise<string[]> {
  try {
    return await getEnabledLocalesCached();
  } catch (error) {
    // A DB outage must not take the whole site down
    console.error("Failed to load enabled languages", error);
    return defaultEnabled();
  }
}
