import type { TranslationRow } from "./catalog";
import { effectiveValue } from "./cell";

export type LanguageStat = {
  code: string;
  enabled: boolean;
  isDefault: boolean;
  translated: number;
  total: number;
};

// A key counts as translated when the table would show a non-empty text for it
export function getLanguageStats(
  rows: TranslationRow[],
  allLocales: readonly string[],
  enabledLocales: readonly string[],
  defaultLocale: string,
): LanguageStat[] {
  return allLocales.map((code) => ({
    code,
    enabled: enabledLocales.includes(code),
    isDefault: code === defaultLocale,
    total: rows.length,
    translated: rows.filter((row) => {
      const cell = row.cells[code];
      return cell ? effectiveValue(cell).trim() !== "" : false;
    }).length,
  }));
}
