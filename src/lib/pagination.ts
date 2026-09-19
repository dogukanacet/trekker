const DEFAULT_PAGE_SIZE = 10;

type SearchParamsLike = URLSearchParams | Record<string, string | string[] | undefined>;

export function parsePagination(searchParams: SearchParamsLike) {
  const get = (key: string): string | null => {
    if (searchParams instanceof URLSearchParams) return searchParams.get(key);
    const value = searchParams[key];
    return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
  };

  const rawPage = Number(get("page"));
  const rawPageSize = Number(get("pageSize"));

  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize =
    Number.isInteger(rawPageSize) && rawPageSize > 0 ? rawPageSize : DEFAULT_PAGE_SIZE;

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
