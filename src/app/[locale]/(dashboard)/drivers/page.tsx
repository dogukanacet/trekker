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
import { AddDriverDialog } from "@/app/[locale]/(dashboard)/drivers/AddDriverDialog";
import DriverRow from "@/app/[locale]/(dashboard)/drivers/DriverRow";
import DriversFilterBar from "@/app/[locale]/(dashboard)/drivers/DriversFilterBar";
import { getTranslations } from "next-intl/server";

const DriversPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; depotId?: string }>;
}) => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const { q, depotId } = await searchParams;
  const depotList = await prisma.depot.findMany({
    where: { tenantId },
  });
  const driverList = await prisma.driver.findMany({
    where: {
      depot: { tenantId, ...(depotId ? { id: depotId } : {}) },
      ...(q ? { fullName: { contains: q, mode: "insensitive" } } : {}),
    },
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
        <DriversFilterBar depotList={depotList} />
        <AddDriverDialog depotList={depotList} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("name")}</TableHead>
            <TableHead>{t("depot")}</TableHead>
            <TableHead>{t("licenseUntil")}</TableHead>
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
