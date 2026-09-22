import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { typography } from "@/lib/constants";
import { AddDriverDialog } from "@/app/[locale]/(dashboard)/drivers/AddDriverDialog";
import DriverGrid from "@/app/[locale]/(dashboard)/drivers/DriverGrid";
import { getTranslations } from "next-intl/server";
import { buildOrderBy } from "@/lib/build-order-by";
import { buildPrismaWhereParams, type FilterFieldConfig } from "@/lib/build-prisma-where";
import { parsePagination } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";

const driverFilters: FilterFieldConfig[] = [
  { key: "q", field: "fullName", type: "text" },
  { key: "licenseUntil", field: "licenseUntil", type: "dateRange" },
  { key: "depotId", field: "depotId", type: "in" },
];

const DriversPage = async ({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    depotId?: string;
    sortBy?: string;
    sortOrder?: string;
    licenseUntilFrom?: string;
    licenseUntilTo?: string;
    page?: string;
    pageSize?: string;
  }>;
}) => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const params = await searchParams;
  const driverSortKeys = ["fullName", "depotId", "licenseUntil"] as const;

  const { page, pageSize, skip, take } = parsePagination({
    page: params.page,
    pageSize: params.pageSize,
  });

  const where: Prisma.DriverWhereInput = {
    depot: { tenantId },
    ...buildPrismaWhereParams(params, driverFilters),
  };

  const [depotList, driverList, totalCount] = await Promise.all([
    prisma.depot.findMany({ where: { tenantId } }),
    prisma.driver.findMany({
      where,
      orderBy: buildOrderBy(driverSortKeys, params.sortBy, params.sortOrder),
      skip,
      take,
    }),
    prisma.driver.count({ where }),
  ]);
  const t = await getTranslations("Drivers");

  return (
    <div className="space-y-6">
      <div className="flex flex-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>{t("title")}</h1>
          <p className={typography.secondary}>{t("subtitle")}</p>
        </div>
      </div>
      <div className="flex flex-center justify-between">
        <AddDriverDialog depotList={depotList} />
      </div>
      <DriverGrid
        driverList={driverList}
        depotList={depotList}
        pagination={{ page, pageSize, totalCount }}
      />
    </div>
  );
};

export default DriversPage;
