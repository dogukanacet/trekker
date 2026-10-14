import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildOrderBy } from "@/lib/build-order-by";
import { buildPrismaWhereParams, type FilterFieldConfig } from "@/lib/build-prisma-where";

export const routeFilters: FilterFieldConfig[] = [
  { key: "q", field: "name", type: "text" },
  { key: "depotId", field: "depotId", type: "in" },
  { key: "createdAt", field: "createdAt", type: "dateRange" },
];

export const routeSortKeys = ["name", "depotId", "createdAt"] as const;

type QueryParams = Record<string, string | undefined>;

export function buildRouteWhere(
  params: QueryParams,
  tenantId: string | undefined,
): Prisma.RouteWhereInput {
  return {
    depot: { tenantId },
    ...buildPrismaWhereParams(params, routeFilters),
  };
}

export function getRouteRows(
  params: QueryParams,
  tenantId: string | undefined,
  page: { skip: number; take: number },
) {
  return prisma.route.findMany({
    where: buildRouteWhere(params, tenantId),
    orderBy: buildOrderBy(routeSortKeys, params.sortBy, params.sortOrder),
    skip: page.skip,
    take: page.take,
  });
}
