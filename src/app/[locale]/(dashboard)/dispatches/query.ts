import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildOrderBy } from "@/lib/build-order-by";
import {
  buildPrismaWhereParams,
  type FilterFieldConfig,
  type SearchParamsFromFilters,
} from "@/lib/build-prisma-where";

export const dispatchFilters = [
  { key: "status", field: "status", type: "in" },
  { key: "date", field: "date", type: "dateRange" },
] as const satisfies FilterFieldConfig[];

export const dispatchSortKeys = {
  status: "status",
  date: "date",
  vehiclePlate: ["vehicle", "plate"],
  driverName: ["driver", "fullName"],
  routeName: ["route", "name"],
} as const;

export type DispatchFilterParams = SearchParamsFromFilters<typeof dispatchFilters>;

type QueryParams = Record<string, string | undefined>;

export type DispatchScope = {
  tenantId: string | undefined;
  role: Role | undefined;
  driverId: string | null | undefined;
};

export function buildDispatchWhere(
  params: QueryParams,
  scope: DispatchScope,
): Prisma.DispatchWhereInput {
  const { depotId, vehiclePlate, driverName, routeName } = params;

  return {
    vehicle: {
      depot: { tenantId: scope.tenantId, ...(depotId ? { id: depotId } : {}) },
      ...(vehiclePlate ? { plate: { contains: vehiclePlate, mode: "insensitive" } } : {}),
    },
    ...(driverName ? { driver: { fullName: { contains: driverName, mode: "insensitive" } } } : {}),
    ...(routeName ? { route: { name: { contains: routeName, mode: "insensitive" } } } : {}),
    ...buildPrismaWhereParams(params, dispatchFilters),
    // DRIVER users see only their own dispatches. If there is no linked Driver record, an empty
    // string matches no records (undefined would cause the filter to be ignored and return everything).
    ...(scope.role === "DRIVER" ? { driverId: scope.driverId ?? "" } : {}),
  };
}

export function getDispatchRows(
  params: QueryParams,
  scope: DispatchScope,
  page: { skip: number; take: number },
) {
  return prisma.dispatch.findMany({
    where: buildDispatchWhere(params, scope),
    include: { vehicle: true, driver: true, route: true },
    orderBy: buildOrderBy(dispatchSortKeys, params.sortBy, params.sortOrder),
    skip: page.skip,
    take: page.take,
  });
}
