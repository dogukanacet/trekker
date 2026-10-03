import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { typography } from "@/lib/constants";
import { buildPrismaWhereParams, type FilterFieldConfig } from "@/lib/build-prisma-where";
import { buildOrderBy } from "@/lib/build-order-by";
import { parsePagination } from "@/lib/pagination";
import { AddUserDialog } from "@/app/[locale]/(dashboard)/users/AddUserDialog";
import UserGrid from "@/app/[locale]/(dashboard)/users/UserGrid";
import { getTranslations } from "next-intl/server";
import type { Prisma } from "@prisma/client";

const userFilters: FilterFieldConfig[] = [
  { key: "q", field: "email", type: "text" },
  { key: "role", field: "role", type: "in" },
];

const UsersPage = async ({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    pageSize?: string;
  }>;
}) => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const params = await searchParams;
  const userSortKeys = ["email", "role"] as const;

  const { page, pageSize, skip, take } = parsePagination({
    page: params.page,
    pageSize: params.pageSize,
  });

  const where: Prisma.UserWhereInput = {
    tenantId,
    ...buildPrismaWhereParams(params, userFilters),
  };

  const [userList, totalCount, driverList] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { driver: { select: { id: true, fullName: true } } },
      orderBy: buildOrderBy(userSortKeys, params.sortBy, params.sortOrder),
      skip,
      take,
    }),
    prisma.user.count({ where }),
    prisma.driver.findMany({
      where: { depot: { tenantId } },
      select: { id: true, fullName: true, userId: true },
    }),
  ]);
  const t = await getTranslations("Users");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>{t("title")}</h1>
          <p className={typography.secondary}>{t("subtitle")}</p>
        </div>
        <AddUserDialog driverList={driverList} />
      </div>

      <UserGrid
        userList={userList}
        driverList={driverList}
        currentUserId={session?.user?.id ?? ""}
        pagination={{ page, pageSize, totalCount }}
      />
    </div>
  );
};

export default UsersPage;
