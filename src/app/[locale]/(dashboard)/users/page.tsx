import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { typography } from "@/lib/constants";
import { parsePagination } from "@/lib/pagination";
import { AddUserDialog } from "@/app/[locale]/(dashboard)/users/AddUserDialog";
import UserGrid from "@/app/[locale]/(dashboard)/users/UserGrid";
import { buildUserWhere, getUserRows } from "@/app/[locale]/(dashboard)/users/query";
import { getTranslations } from "next-intl/server";

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

  const { page, pageSize, skip, take } = parsePagination({
    page: params.page,
    pageSize: params.pageSize,
  });

  const [userList, totalCount, driverList] = await Promise.all([
    getUserRows(params, tenantId, { skip, take }),
    prisma.user.count({ where: buildUserWhere(params, tenantId) }),
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
