export function buildOrderBy<TKey extends string>(
  allowedKeys: readonly TKey[],
  defaultKey: TKey,
  sortBy?: string,
  sortOrder?: string,
): Record<TKey, "asc" | "desc"> {
  const order: "asc" | "desc" = sortOrder === "desc" ? "desc" : "asc";
  const key = allowedKeys.find((k) => k === sortBy) ?? defaultKey;
  return { [key]: order } as Record<TKey, "asc" | "desc">;
}
