import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { typography } from "@/lib/constants";
import { parsePagination } from "@/lib/pagination";
import { AddRouteDialog } from "@/app/[locale]/(dashboard)/routes/AddRouteDialog";
import RouteGrid from "@/app/[locale]/(dashboard)/routes/RouteGrid";
import { buildRouteWhere, getRouteRows } from "@/app/[locale]/(dashboard)/routes/query";
import { getTranslations } from "next-intl/server";

const RoutesPage = async ({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    depotId?: string;
    sortBy?: string;
    sortOrder?: string;
    createdAtFrom?: string;
    createdAtTo?: string;
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

  const [depotList, routeList, totalCount] = await Promise.all([
    prisma.depot.findMany({ where: { tenantId } }),
    getRouteRows(params, tenantId, { skip, take }),
    prisma.route.count({ where: buildRouteWhere(params, tenantId) }),
  ]);
  const t = await getTranslations("Routes");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>{t("title")}</h1>
          <p className={typography.secondary}>{t("subtitle")}</p>
        </div>
        <AddRouteDialog depotList={depotList} />
      </div>

      <RouteGrid
        routeList={routeList}
        depotList={depotList}
        pagination={{ page, pageSize, totalCount }}
      />
    </div>
  );
};

export default RoutesPage;
