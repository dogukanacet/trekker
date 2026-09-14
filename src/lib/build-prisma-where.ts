export type FilterFieldConfig =
  | { key: string; field: string; type: "text" }
  | { key: string; field: string; type: "exact" }
  | { key: string; field: string; type: "in" }
  | { key: string; field: string; type: "dateRange" };

export type SearchParamsFromFilters<T extends readonly { key: string; type: string }[]> = {
  [
    K in T[number] as K["type"] extends "dateRange" ? `${K["key"]}From` | `${K["key"]}To` : K["key"]
  ]?: string;
};

export function buildPrismaWhereParams(
  searchParams: Record<string, string | undefined>,
  fields: FilterFieldConfig[],
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  for (const config of fields) {
    switch (config.type) {
      case "text": {
        const value = searchParams[config.key];
        if (value) where[config.field] = { contains: value, mode: "insensitive" };
        break;
      }
      case "exact": {
        const value = searchParams[config.key];
        if (value) where[config.field] = value;
        break;
      }
      case "in": {
        const value = searchParams[config.key];
        if (value) where[config.field] = { in: value.split(",") };
        break;
      }
      case "dateRange": {
        const from = searchParams[`${config.key}From`];
        const to = searchParams[`${config.key}To`];
        if (from || to) {
          where[config.field] = {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          };
        }
        break;
      }
    }
  }

  return where;
}
