import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { getMergedMessages } from "./messages";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "tr" | "en")) {
    locale = routing.defaultLocale;
  }

  let messages;
  try {
    messages = await getMergedMessages(locale);
  } catch (error) {
    // Fall back to the bundled JSON so a DB outage never breaks the UI.
    // The failure is thrown outside the cache, so it is not cached either.
    console.error("Failed to load translation overrides", error);
    messages = (await import(`../../localizations/${locale}.json`)).default;
  }

  return { locale, messages };
});
