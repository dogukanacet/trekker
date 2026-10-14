import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildOrderBy } from "@/lib/build-order-by";
import { buildPrismaWhereParams, type FilterFieldConfig } from "@/lib/build-prisma-where";

export const vehicleFilters: FilterFieldConfig[] = [
  { key: "q", field: "plate", type: "text" },
  { key: "model", field: "model", type: "text" },
  { key: "depotId", field: "depotId", type: "in" },
  { key: "insuranceUntil", field: "insuranceUntil", type: "dateRange" },
  { key: "inspectionUntil", field: "inspectionUntil", type: "dateRange" },
];

export const vehicleSortKeys = ["plate", "model", "insuranceUntil", "inspectionUntil"] as const;

type QueryParams = Record<string, string | undefined>;

export function buildVehicleWhere(
  params: QueryParams,
  tenantId: string | undefined,
): Prisma.VehicleWhereInput {
  return {
    depot: { tenantId },
    ...buildPrismaWhereParams(params, vehicleFilters),
  };
}

export function getVehicleRows(
  params: QueryParams,
  tenantId: string | undefined,
  page: { skip: number; take: number },
) {
  return prisma.vehicle.findMany({
    where: buildVehicleWhere(params, tenantId),
    orderBy: buildOrderBy(vehicleSortKeys, params.sortBy, params.sortOrder),
    skip: page.skip,
    take: page.take,
  });
}
