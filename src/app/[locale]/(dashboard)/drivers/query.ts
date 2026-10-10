import type { Prisma } from "@prisma/client";
import { buildPrismaWhereParams, type FilterFieldConfig } from "@/lib/build-prisma-where";

export const driverFilters: FilterFieldConfig[] = [
  { key: "q", field: "fullName", type: "text" },
  { key: "licenseUntil", field: "licenseUntil", type: "dateRange" },
  { key: "depotId", field: "depotId", type: "in" },
];

export const driverSortKeys = ["fullName", "depotId", "licenseUntil"] as const;

export function buildDriverWhere(
  params: Record<string, string | undefined>,
  tenantId: string | undefined,
): Prisma.DriverWhereInput {
  return {
    depot: { tenantId },
    ...buildPrismaWhereParams(params, driverFilters),
  };
}
