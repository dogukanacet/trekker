import type { TranslationRow } from "./catalog";
import { effectiveValue, getRowStatus, type RowStatus } from "./cell";

type QueryParams = Record<string, string | undefined>;
type RowComparator = (a: TranslationRow, b: TranslationRow) => number;

const LOCALE_SORT_PREFIX = "locale-";

const statusRank: Record<RowStatus, number> = { default: 0, published: 1, draft: 2 };

// Case-, accent- and dotless-i-insensitive form used for all comparisons
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .toLowerCase();
}

// Matches the key and what the table actually shows for the given locales
function matchesSearch(row: TranslationRow, needle: string, locales?: readonly string[]): boolean {
  if (fold(row.id).includes(needle)) return true;
  const cells = locales
    ? locales.flatMap((code) => {
        const cell = row.cells[code];
        return cell ? [cell] : [];
      })
    : Object.values(row.cells);
  return cells.some((cell) => fold(effectiveValue(cell)).includes(needle));
}

// Returns null for unknown sort keys so a bad URL param never breaks the page
function getComparator(sortBy: string | undefined, rows: TranslationRow[]): RowComparator | null {
  if (!sortBy) return null;

  if (sortBy === "status") {
    return (a, b) => statusRank[getRowStatus(a)] - statusRank[getRowStatus(b)];
  }
  if (sortBy === "namespace" || sortBy === "key") {
    return (a, b) => a[sortBy].localeCompare(b[sortBy]);
  }
  if (sortBy.startsWith(LOCALE_SORT_PREFIX)) {
    const locale = sortBy.slice(LOCALE_SORT_PREFIX.length);
    // A locale no row knows about is not a sortable column
    if (!rows.some((row) => Object.hasOwn(row.cells, locale))) return null;
    // Compares what the table shows, using the language's own collation rules
    return (a, b) => {
      const left = a.cells[locale];
      const right = b.cells[locale];
      return (left ? effectiveValue(left) : "").localeCompare(
        right ? effectiveValue(right) : "",
        locale,
      );
    };
  }
  return null;
}

// The catalog comes from JSON files, not from the DB, so filtering,
// sorting and paging happen in memory (a few hundred rows at most).
export function queryTranslationRows(
  rows: TranslationRow[],
  params: QueryParams,
  page: { skip: number; take: number },
  options: { locales?: readonly string[] } = {},
) {
  const search = params.search?.trim();
  const key = params.key?.trim();
  const namespace = params.namespace?.trim();
  const statuses = params.status?.split(",").filter(Boolean) ?? [];

  let filtered = rows;

  if (search) {
    const needle = fold(search);
    filtered = filtered.filter((row) => matchesSearch(row, needle, options.locales));
  }
  if (key) {
    const needle = fold(key);
    filtered = filtered.filter((row) => fold(row.key).includes(needle));
  }
  if (namespace) {
    const needle = fold(namespace);
    filtered = filtered.filter((row) => fold(row.namespace).includes(needle));
  }
  if (statuses.length > 0) {
    filtered = filtered.filter((row) => statuses.includes(getRowStatus(row)));
  }

  const compare = getComparator(params.sortBy, rows);
  if (compare) {
    const direction = params.sortOrder === "desc" ? -1 : 1;
    // The id tiebreaker keeps paging stable when many rows share the same value
    filtered = [...filtered].sort((a, b) => compare(a, b) * direction || a.id.localeCompare(b.id));
  }

  return {
    rows: filtered.slice(page.skip, page.skip + page.take),
    totalCount: filtered.length,
  };
}
