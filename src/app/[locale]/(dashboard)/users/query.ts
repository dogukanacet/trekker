import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildOrderBy } from "@/lib/build-order-by";
import { buildPrismaWhereParams, type FilterFieldConfig } from "@/lib/build-prisma-where";

export const userFilters: FilterFieldConfig[] = [
  { key: "q", field: "email", type: "text" },
  { key: "role", field: "role", type: "in" },
];

export const userSortKeys = ["email", "role"] as const;

type QueryParams = Record<string, string | undefined>;

export function buildUserWhere(
  params: QueryParams,
  tenantId: string | undefined,
): Prisma.UserWhereInput {
  return {
    tenantId,
    ...buildPrismaWhereParams(params, userFilters),
  };
}

export function getUserRows(
  params: QueryParams,
  tenantId: string | undefined,
  page: { skip: number; take: number },
) {
  return prisma.user.findMany({
    where: buildUserWhere(params, tenantId),
    // Keep sensitive fields (passwordHash, etc.) out of the client response; return only fields used by the UI.
    select: {
      id: true,
      email: true,
      role: true,
      driver: { select: { id: true, fullName: true } },
    },
    orderBy: buildOrderBy(userSortKeys, params.sortBy, params.sortOrder),
    skip: page.skip,
    take: page.take,
  });
}

export type UserRow = Awaited<ReturnType<typeof getUserRows>>[number];
