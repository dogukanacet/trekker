import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { typography } from "@/lib/constants";
import { AddDriverDialog } from "@/app/[locale]/(dashboard)/drivers/AddDriverDialog";
import DriverGrid from "@/app/[locale]/(dashboard)/drivers/DriverGrid";
import { buildDriverWhere, driverSortKeys } from "@/app/[locale]/(dashboard)/drivers/query";
import { ExportButtons } from "@/components/export-buttons";
import { getTranslations } from "next-intl/server";
import { buildOrderBy } from "@/lib/build-order-by";
import { parsePagination } from "@/lib/pagination";

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

  const { page, pageSize, skip, take } = parsePagination({
    page: params.page,
    pageSize: params.pageSize,
  });

  const where = buildDriverWhere(params, tenantId);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>{t("title")}</h1>
          <p className={typography.secondary}>{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons resource="drivers" />
          <AddDriverDialog depotList={depotList} />
        </div>
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
