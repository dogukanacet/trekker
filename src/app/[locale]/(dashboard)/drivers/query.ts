import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildOrderBy } from "@/lib/build-order-by";
import { buildPrismaWhereParams, type FilterFieldConfig } from "@/lib/build-prisma-where";

export const driverFilters: FilterFieldConfig[] = [
  { key: "q", field: "fullName", type: "text" },
  { key: "licenseUntil", field: "licenseUntil", type: "dateRange" },
  { key: "depotId", field: "depotId", type: "in" },
];

export const driverSortKeys = ["fullName", "depotId", "licenseUntil"] as const;

type QueryParams = Record<string, string | undefined>;

export function buildDriverWhere(
  params: QueryParams,
  tenantId: string | undefined,
): Prisma.DriverWhereInput {
  return {
    depot: { tenantId },
    ...buildPrismaWhereParams(params, driverFilters),
  };
}

export function getDriverRows(
  params: QueryParams,
  tenantId: string | undefined,
  page: { skip: number; take: number },
) {
  return prisma.driver.findMany({
    where: buildDriverWhere(params, tenantId),
    orderBy: buildOrderBy(driverSortKeys, params.sortBy, params.sortOrder),
    skip: page.skip,
    take: page.take,
  });
}
