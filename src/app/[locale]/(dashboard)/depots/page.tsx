import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { typography } from "@/lib/constants";
import { buildPrismaWhereParams, type FilterFieldConfig } from "@/lib/build-prisma-where";
import { buildOrderBy } from "@/lib/build-order-by";
import { parsePagination } from "@/lib/pagination";
import { AddDepotDialog } from "@/app/[locale]/(dashboard)/depots/AddDepotDialog";
import DepotGrid from "@/app/[locale]/(dashboard)/depots/DepotGrid";
import { getTranslations } from "next-intl/server";
import type { Prisma } from "@prisma/client";

const depotFilters: FilterFieldConfig[] = [{ key: "q", field: "name", type: "text" }];

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
  const params = await searchParams;
  const depotSortKeys = ["name"] as const;

  const { page, pageSize, skip, take } = parsePagination({
    page: params.page,
    pageSize: params.pageSize,
  });

  const where: Prisma.DepotWhereInput = {
    tenantId,
    ...buildPrismaWhereParams(params, depotFilters),
  };

  const [depotList, totalCount] = await Promise.all([
    prisma.depot.findMany({
      where,
      include: { _count: { select: { vehicles: true, drivers: true, routes: true } } },
      orderBy: buildOrderBy(depotSortKeys, params.sortBy, params.sortOrder),
      skip,
      take,
    }),
    prisma.depot.count({ where }),
  ]);
  const t = await getTranslations("Depots");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>{t("title")}</h1>
          <p className={typography.secondary}>{t("subtitle")}</p>
        </div>
        <AddDepotDialog />
      </div>

      <DepotGrid depotList={depotList} pagination={{ page, pageSize, totalCount }} />
    </div>
  );
};

export default DepotsPage;
