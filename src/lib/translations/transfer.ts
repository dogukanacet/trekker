import type { TranslationRow } from "./catalog";
import { effectiveValue } from "./cell";
import { findKeyConflict, isValidKeyPath, isValidNamespace } from "./key-rules";
import { validateTranslation, type ValidationIssue } from "./validate";

// { locale: { "Namespace.key": "text" } }, the same shape as localizations/translations.json
export type TranslationExport = Record<string, Record<string, string>>;

export const MAX_TEXT_LENGTH = 2000;

// Exports what the table shows (drafts included) for the chosen locales, empty texts left out
export function buildExport(rows: TranslationRow[], locales: readonly string[]): TranslationExport {
  const result: TranslationExport = {};
  for (const locale of locales) {
    const entries: Record<string, string> = {};
    for (const row of rows) {
      const cell = row.cells[locale];
      const value = cell ? effectiveValue(cell) : "";
      if (value.trim() !== "") entries[row.id] = value;
    }
    result[locale] = entries;
  }
  return result;
}

export type ImportEntry = { locale: string; namespace: string; key: string; value: string };

export type ImportProblem =
  | {
      locale: string;
      id: string;
      kind: "notText" | "empty" | "tooLong" | "badKey" | "keyConflict" | "defaultMissing";
    }
  | { locale: string; id: string; kind: "invalid"; issue: ValidationIssue };

export type ImportAnalysis = {
  // Valid and different from what the table shows: these become drafts
  entries: ImportEntry[];
  unchanged: number;
  unknownLocales: string[];
  // Keys that are not in the catalog and are skipped (only when creating keys is off)
  unknownKeyCount: number;
  unknownKeyExamples: string[];
  // Keys that will be created (only when creating keys is on)
  newKeys: string[];
  problems: ImportProblem[];
};

export type ImportOptions = {
  createKeys: boolean;
  defaultLocale: string;
  // False when a locale file already holds something (an array, a text) at this path
  isPathAvailable: (namespace: string, key: string) => boolean;
};

export type ImportParseResult =
  { ok: true; analysis: ImportAnalysis } | { ok: false; error: "format" | "tooManyEntries" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function checkText(value: unknown): "notText" | "empty" | "tooLong" | null {
  if (typeof value !== "string") return "notText";
  if (value.trim() === "") return "empty";
  if (value.length > MAX_TEXT_LENGTH) return "tooLong";
  return null;
}

// Turns keys that are not in the catalog into new custom keys, with the same rules as the
// "new translation" dialog. Each key is judged on its own: a bad key never blocks the others.
function planNewKeys(
  unknownKeys: Map<string, Map<string, unknown>>,
  knownIds: Set<string>,
  options: ImportOptions,
  analysis: ImportAnalysis,
): void {
  const { defaultLocale } = options;

  for (const [id, texts] of [...unknownKeys].sort(([a], [b]) => compareText(a, b))) {
    const dot = id.indexOf(".");
    const namespace = dot > 0 ? id.slice(0, dot) : "";
    const key = dot > 0 ? id.slice(dot + 1) : "";

    if (!isValidNamespace(namespace) || !isValidKeyPath(key)) {
      analysis.problems.push({ locale: defaultLocale, id, kind: "badKey" });
      continue;
    }
    if (
      findKeyConflict(namespace, key, [...knownIds]) !== null ||
      !options.isPathAvailable(namespace, key)
    ) {
      analysis.problems.push({ locale: defaultLocale, id, kind: "keyConflict" });
      continue;
    }

    // The default language text defines the placeholders of a new key, so it must be valid
    const defaultValue = texts.get(defaultLocale);
    if (defaultValue === undefined) {
      analysis.problems.push({ locale: defaultLocale, id, kind: "defaultMissing" });
      continue;
    }
    const defaultProblem = checkText(defaultValue);
    if (defaultProblem !== null || typeof defaultValue !== "string") {
      analysis.problems.push({ locale: defaultLocale, id, kind: defaultProblem ?? "notText" });
      continue;
    }
    const defaultIssue = validateTranslation(defaultValue, null);
    if (defaultIssue) {
      analysis.problems.push({ locale: defaultLocale, id, kind: "invalid", issue: defaultIssue });
      continue;
    }

    for (const [locale, value] of texts) {
      const problem = checkText(value);
      if (problem !== null || typeof value !== "string") {
        analysis.problems.push({ locale, id, kind: problem ?? "notText" });
        continue;
      }
      const issue = locale === defaultLocale ? null : validateTranslation(value, defaultValue);
      if (issue) {
        analysis.problems.push({ locale, id, kind: "invalid", issue });
        continue;
      }
      analysis.entries.push({ locale, namespace, key, value });
    }

    analysis.newKeys.push(id);
    // Later keys of the same file must not collide with this one
    knownIds.add(id);
  }
}

// Checks an uploaded file against the catalog. Nothing here touches the database.
export function analyzeImport(
  data: unknown,
  rows: TranslationRow[],
  resolveReference: (namespace: string, key: string, locale: string) => string | null,
  allowedLocales: readonly string[],
  maxEntries: number,
  options: ImportOptions,
): ImportParseResult {
  if (!isRecord(data)) return { ok: false, error: "format" };

  let total = 0;
  for (const value of Object.values(data)) {
    if (!isRecord(value)) return { ok: false, error: "format" };
    total += Object.keys(value).length;
  }
  if (total > maxEntries) return { ok: false, error: "tooManyEntries" };

  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const analysis: ImportAnalysis = {
    entries: [],
    unchanged: 0,
    unknownLocales: [],
    unknownKeyCount: 0,
    unknownKeyExamples: [],
    newKeys: [],
    problems: [],
  };
  // id -> (locale -> raw value) for every key the catalog does not know
  const unknownKeys = new Map<string, Map<string, unknown>>();

  for (const [locale, texts] of Object.entries(data)) {
    if (!allowedLocales.includes(locale)) {
      analysis.unknownLocales.push(locale);
      continue;
    }
    if (!isRecord(texts)) continue;

    for (const [id, value] of Object.entries(texts)) {
      const row = rowsById.get(id);
      if (!row) {
        const byLocale = unknownKeys.get(id) ?? new Map<string, unknown>();
        byLocale.set(locale, value);
        unknownKeys.set(id, byLocale);
        continue;
      }

      const problem = checkText(value);
      if (problem !== null || typeof value !== "string") {
        analysis.problems.push({ locale, id, kind: problem ?? "notText" });
        continue;
      }

      const cell = row.cells[locale];
      if (cell && value === effectiveValue(cell)) {
        analysis.unchanged++;
        continue;
      }

      const issue = validateTranslation(value, resolveReference(row.namespace, row.key, locale));
      if (issue) {
        analysis.problems.push({ locale, id, kind: "invalid", issue });
        continue;
      }

      analysis.entries.push({ locale, namespace: row.namespace, key: row.key, value });
    }
  }

  if (options.createKeys) {
    planNewKeys(unknownKeys, new Set(rowsById.keys()), options, analysis);
  } else {
    analysis.unknownKeyCount = unknownKeys.size;
    analysis.unknownKeyExamples = [...unknownKeys.keys()].slice(0, 5);
  }

  return { ok: true, analysis };
}
