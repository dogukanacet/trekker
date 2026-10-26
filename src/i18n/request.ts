import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { getMergedMessages } from "./messages";
import { loadBaseMessages } from "./load-base";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  let messages;
  try {
    messages = await getMergedMessages(locale);
  } catch (error) {
    // Fall back to the bundled JSON so a DB outage never breaks the UI.
    // The failure is thrown outside the cache, so it is not cached either.
    console.error("Failed to load translation overrides", error);
    messages = await loadBaseMessages(locale);
  }

  return { locale, messages };
});
