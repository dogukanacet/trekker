export function buildOrderBy<TKey extends string>(
  allowedKeys: readonly TKey[],
  sortBy?: string,
  sortOrder?: string,
): Record<TKey, "asc" | "desc"> | undefined {
  const key = allowedKeys.find((k) => k === sortBy);
  if (!key) return undefined;

  const order: "asc" | "desc" = sortOrder === "desc" ? "desc" : "asc";
  return { [key]: order } as Record<TKey, "asc" | "desc">;
}
