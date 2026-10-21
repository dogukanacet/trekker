import { routing } from "./routing";

export type Messages = Record<string, unknown>;

// A locale without a JSON file is valid: it falls back to the default locale's text.
// The default locale's file is required, so a failure there is a real error.
export async function loadBaseMessages(locale: string): Promise<Messages> {
  try {
    return (await import(`../../localizations/${locale}.json`)).default as Messages;
  } catch (error) {
    if (locale === routing.defaultLocale) throw error;
    return {};
  }
}
