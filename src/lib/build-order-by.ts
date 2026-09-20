type OrderByPath = string | readonly string[];

function toSegments(path: OrderByPath): string[] {
  return typeof path === "string" ? [path] : [...path];
}

export function buildOrderBy<TKey extends string>(
  allowedKeys: readonly TKey[] | Record<TKey, OrderByPath>,
  sortBy?: string,
  sortOrder?: string,
): Record<string, unknown> | undefined {
  if (!sortBy) return undefined;

  const order: "asc" | "desc" = sortOrder === "desc" ? "desc" : "asc";

  const map: Record<string, OrderByPath> = Array.isArray(allowedKeys)
    ? Object.fromEntries(allowedKeys.map((k) => [k, k]))
    : (allowedKeys as Record<string, OrderByPath>);

  const path = sortBy ? map[sortBy] : undefined;
  if (!path) return undefined;

  const segments = toSegments(path);

  return segments.reduceRight<unknown>((acc, segment) => ({ [segment]: acc }), order) as Record<
    string,
    unknown
  >;
}
