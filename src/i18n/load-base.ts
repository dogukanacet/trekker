import translationsFile from "../../localizations/translations.json";
import { routing } from "./routing";
import { unflattenMessages, type FlatMessages } from "./flat-format";

export type Messages = Record<string, unknown>;

// { locale: { "Namespace.key": "text" } }
const file = translationsFile as unknown as Record<string, FlatMessages>;

// A locale without entries is valid: its texts show up as key names until translated.
// The default locale must have entries, so an empty one is a real error.
export async function loadBaseMessages(locale: string): Promise<Messages> {
  const flat = Object.hasOwn(file, locale) ? file[locale] : undefined;

  if (!flat || Object.keys(flat).length === 0) {
    if (locale === routing.defaultLocale) {
      throw new Error(`No messages found for the default locale "${locale}"`);
    }
    return {};
  }

  const { tree, skipped } = unflattenMessages(flat);
  if (skipped.length > 0) {
    console.error(`Skipped conflicting or invalid message keys for "${locale}":`, skipped);
  }
  return tree;
}
