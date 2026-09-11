import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { typography } from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ColumnHeader } from "@/components/ui/data-table/column-header";
import { buildOrderBy } from "@/lib/build-order-by";
import { AddDriverDialog } from "@/app/[locale]/(dashboard)/drivers/AddDriverDialog";
import DriverRow from "@/app/[locale]/(dashboard)/drivers/DriverRow";
import { getTranslations } from "next-intl/server";

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
  }>;
}) => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const { q, depotId, sortBy, sortOrder, licenseUntilFrom, licenseUntilTo } = await searchParams;
  const driverSortKeys = ["fullName", "licenseUntil"] as const;

  const depotList = await prisma.depot.findMany({
    where: { tenantId },
  });
  const driverList = await prisma.driver.findMany({
    where: {
      depot: {
        tenantId,
        ...(depotId ? { id: depotId } : {}),
      },
      ...(q ? { fullName: { contains: q, mode: "insensitive" } } : {}),
      ...(licenseUntilFrom || licenseUntilTo
        ? {
            licenseUntil: {
              ...(licenseUntilFrom ? { gte: new Date(licenseUntilFrom) } : {}),
              ...(licenseUntilTo ? { lte: new Date(licenseUntilTo) } : {}),
            },
          }
        : {}),
    },
    orderBy: buildOrderBy(driverSortKeys, "fullName", sortBy, sortOrder),
  });
  const t = await getTranslations("Drivers");
  const common = await getTranslations("Common");

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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <ColumnHeader
                label={t("name")}
                sortKey="fullName"
                filter={{ type: "text", key: "q", placeholder: common("searchPlaceholder") }}
              />
            </TableHead>
            <TableHead>
              <ColumnHeader
                label={t("depot")}
                filter={{
                  type: "select",
                  key: "depotId",
                  placeholder: common("allDepots"),
                  options: depotList.map((d) => ({ value: d.id, label: d.name })),
                }}
              />
            </TableHead>
            <TableHead>
              <ColumnHeader
                label={t("licenseUntil")}
                sortKey="licenseUntil"
                filter={{
                  type: "date-range",
                  key: "licenseUntil",
                  fromLabel: common("startDate"),
                  toLabel: common("endDate"),
                }}
              />
            </TableHead>
            <TableHead className="text-right">{common("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {driverList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>{t("empty")}</TableCell>
            </TableRow>
          ) : (
            driverList.map((driver) => (
              <DriverRow key={driver.id} driver={driver} depotList={depotList} />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default DriversPage;
