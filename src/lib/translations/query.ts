import type { TranslationRow } from "./catalog";

type QueryParams = Record<string, string | undefined>;

export const translationSortKeys = ["namespace", "key"] as const;

function matchesSearch(row: TranslationRow, q: string): boolean {
  const needle = q.toLowerCase();
  if (row.id.toLowerCase().includes(needle)) return true;
  return Object.values(row.cells).some((cell) =>
    [cell.base, cell.published, cell.draft].some((value) => value?.toLowerCase().includes(needle)),
  );
}

// The catalog comes from JSON files, not from the DB, so filtering,
// sorting and paging happen in memory (a few hundred rows at most).
export function queryTranslationRows(
  rows: TranslationRow[],
  params: QueryParams,
  page: { skip: number; take: number },
) {
  const q = params.q?.trim();
  const namespace = params.namespace?.trim().toLowerCase();

  let filtered = rows;
  if (q) filtered = filtered.filter((row) => matchesSearch(row, q));
  if (namespace) {
    filtered = filtered.filter((row) => row.namespace.toLowerCase().includes(namespace));
  }

  const sortBy = translationSortKeys.find((key) => key === params.sortBy);
  if (sortBy) {
    const direction = params.sortOrder === "desc" ? -1 : 1;
    filtered = [...filtered].sort((a, b) => a[sortBy].localeCompare(b[sortBy]) * direction);
  }

  return {
    rows: filtered.slice(page.skip, page.skip + page.take),
    totalCount: filtered.length,
  };
}
