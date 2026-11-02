import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildOrderBy } from "@/lib/build-order-by";
import {
  buildPrismaWhereParams,
  type FilterFieldConfig,
  type SearchParamsFromFilters,
} from "@/lib/build-prisma-where";

export const auditFilters = [
  { key: "action", field: "action", type: "in" },
  { key: "resource", field: "resource", type: "in" },
  { key: "createdAt", field: "createdAt", type: "dateRange" },
] as const satisfies FilterFieldConfig[];

export const auditSortKeys = {
  createdAt: "createdAt",
  actorEmail: "actorEmail",
  action: "action",
  resource: "resource",
  resourceLabel: "resourceLabel",
} as const;

export type AuditFilterParams = SearchParamsFromFilters<typeof auditFilters>;

type QueryParams = Record<string, string | undefined>;

export function buildAuditWhere(params: QueryParams, tenantId: string): Prisma.AuditLogWhereInput {
  const { actorEmail, resourceLabel } = params;

  return {
    // A required string on purpose: an undefined tenantId would make Prisma drop the
    // condition and return every tenant's log.
    tenantId,
    ...(actorEmail ? { actorEmail: { contains: actorEmail, mode: "insensitive" } } : {}),
    ...(resourceLabel ? { resourceLabel: { contains: resourceLabel, mode: "insensitive" } } : {}),
    ...buildPrismaWhereParams(params, auditFilters),
  };
}

function buildAuditOrderBy(params: QueryParams) {
  const custom = buildOrderBy(auditSortKeys, params.sortBy, params.sortOrder);
  const hasCustom = Array.isArray(custom) ? custom.length > 0 : Boolean(custom);
  // Newest first by default; id breaks ties so pagination stays stable.
  return hasCustom ? custom : [{ createdAt: "desc" as const }, { id: "desc" as const }];
}

export function getAuditRows(
  params: QueryParams,
  tenantId: string,
  page: { skip: number; take: number },
) {
  return prisma.auditLog.findMany({
    where: buildAuditWhere(params, tenantId),
    select: {
      id: true,
      createdAt: true,
      actorEmail: true,
      action: true,
      resource: true,
      resourceLabel: true,
      changes: true,
    },
    orderBy: buildAuditOrderBy(params),
    skip: page.skip,
    take: page.take,
  });
}

export type AuditRow = Awaited<ReturnType<typeof getAuditRows>>[number];
