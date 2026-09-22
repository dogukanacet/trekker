import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { typography } from "@/lib/constants";
import { buildPrismaWhereParams, type FilterFieldConfig } from "@/lib/build-prisma-where";
import { buildOrderBy } from "@/lib/build-order-by";
import { parsePagination } from "@/lib/pagination";
import { AddRouteDialog } from "@/app/[locale]/(dashboard)/routes/AddRouteDialog";
import RouteGrid from "@/app/[locale]/(dashboard)/routes/RouteGrid";
import { getTranslations } from "next-intl/server";
import type { Prisma } from "@prisma/client";

const routeFilters: FilterFieldConfig[] = [
  { key: "q", field: "name", type: "text" },
  { key: "depotId", field: "depotId", type: "in" },
  { key: "createdAt", field: "createdAt", type: "dateRange" },
];

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
  const routeSortKeys = ["name", "depotId", "createdAt"] as const;

  const { page, pageSize, skip, take } = parsePagination({
    page: params.page,
    pageSize: params.pageSize,
  });

  const where: Prisma.RouteWhereInput = {
    depot: { tenantId },
    ...buildPrismaWhereParams(params, routeFilters),
  };

  const [depotList, routeList, totalCount] = await Promise.all([
    prisma.depot.findMany({ where: { tenantId } }),
    prisma.route.findMany({
      where,
      orderBy: buildOrderBy(routeSortKeys, params.sortBy, params.sortOrder),
      skip,
      take,
    }),
    prisma.route.count({ where }),
  ]);
  const t = await getTranslations("Routes");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>{t("title")}</h1>
          <p className={typography.secondary}>{t("subtitle")}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div />
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
