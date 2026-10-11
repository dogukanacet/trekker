import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { typography } from "@/lib/constants";
import { AddDriverDialog } from "@/app/[locale]/(dashboard)/drivers/AddDriverDialog";
import DriverGrid from "@/app/[locale]/(dashboard)/drivers/DriverGrid";
import { buildDriverWhere, getDriverRows } from "@/app/[locale]/(dashboard)/drivers/query";
import { getTranslations } from "next-intl/server";
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

  const [depotList, driverList, totalCount] = await Promise.all([
    prisma.depot.findMany({ where: { tenantId } }),
    getDriverRows(params, tenantId, { skip, take }),
    prisma.driver.count({ where: buildDriverWhere(params, tenantId) }),
  ]);
  const t = await getTranslations("Drivers");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>{t("title")}</h1>
          <p className={typography.secondary}>{t("subtitle")}</p>
        </div>
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
