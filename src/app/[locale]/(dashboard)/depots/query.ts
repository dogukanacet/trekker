import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildOrderBy } from "@/lib/build-order-by";
import { buildPrismaWhereParams, type FilterFieldConfig } from "@/lib/build-prisma-where";

export const depotFilters: FilterFieldConfig[] = [{ key: "q", field: "name", type: "text" }];

export const depotSortKeys = ["name"] as const;

type QueryParams = Record<string, string | undefined>;

export function buildDepotWhere(
  params: QueryParams,
  tenantId: string | undefined,
): Prisma.DepotWhereInput {
  return {
    tenantId,
    ...buildPrismaWhereParams(params, depotFilters),
  };
}

export function getDepotRows(
  params: QueryParams,
  tenantId: string | undefined,
  page: { skip: number; take: number },
) {
  return prisma.depot.findMany({
    where: buildDepotWhere(params, tenantId),
    include: { _count: { select: { vehicles: true, drivers: true, routes: true } } },
    orderBy: buildOrderBy(depotSortKeys, params.sortBy, params.sortOrder),
    skip: page.skip,
    take: page.take,
  });
}
