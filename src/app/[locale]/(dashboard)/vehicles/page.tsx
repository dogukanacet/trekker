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
import { AddVehicleDialog } from "@/app/[locale]/(dashboard)/vehicles/AddVehicleDialog";
import VehicleRow from "@/app/[locale]/(dashboard)/vehicles/VehicleRow";
import VehiclesFilterBar from "@/app/[locale]/(dashboard)/vehicles/VehiclesFilterBar";
import { getTranslations } from "next-intl/server";

const VehiclesPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; depotId?: string }>;
}) => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const { q, depotId } = await searchParams;
  const depotList = await prisma.depot.findMany({ where: { tenantId } });
  const vehicleList = await prisma.vehicle.findMany({
    where: {
      depot: { tenantId, ...(depotId ? { id: depotId } : {}) },
      ...(q ? { plate: { contains: q, mode: "insensitive" } } : {}),
    },
  });
  const t = await getTranslations("Vehicles");
  const common = await getTranslations("Common");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>{t("title")}</h1>
          <p className={typography.secondary}>{t("subtitle")}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <VehiclesFilterBar depotList={depotList} />
        <AddVehicleDialog depotList={depotList} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("plate")}</TableHead>
            <TableHead>{t("model")}</TableHead>
            <TableHead>{t("depot")}</TableHead>
            <TableHead>{t("insuranceUntil")}</TableHead>
            <TableHead>{t("inspectionUntil")}</TableHead>
            <TableHead className="text-right">{common("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicleList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className={`text-center py-8 ${typography.secondary}`}>
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            vehicleList.map((vehicle) => (
              <VehicleRow key={vehicle.id} vehicle={vehicle} depotList={depotList} />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default VehiclesPage;
