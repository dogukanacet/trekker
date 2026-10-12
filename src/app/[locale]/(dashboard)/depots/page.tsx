import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { typography } from "@/lib/constants";
import { parsePagination } from "@/lib/pagination";
import { AddDepotDialog } from "@/app/[locale]/(dashboard)/depots/AddDepotDialog";
import DepotGrid from "@/app/[locale]/(dashboard)/depots/DepotGrid";
import { buildDepotWhere, getDepotRows } from "@/app/[locale]/(dashboard)/depots/query";
import { getTranslations } from "next-intl/server";
import { hasPermission } from "@/lib/permissions";

const DepotsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    pageSize?: string;
  }>;
}) => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const canManage = hasPermission(session?.user?.role, "depots", "update");
  const params = await searchParams;

  const { page, pageSize, skip, take } = parsePagination({
    page: params.page,
    pageSize: params.pageSize,
  });

  const [depotList, totalCount] = await Promise.all([
    getDepotRows(params, tenantId, { skip, take }),
    prisma.depot.count({ where: buildDepotWhere(params, tenantId) }),
  ]);
  const t = await getTranslations("Depots");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>{t("title")}</h1>
          <p className={typography.secondary}>{t("subtitle")}</p>
        </div>
        {canManage && <AddDepotDialog />}
      </div>

      <DepotGrid
        depotList={depotList}
        pagination={{ page, pageSize, totalCount }}
        canManage={canManage}
      />
    </div>
  );
};

export default DepotsPage;
