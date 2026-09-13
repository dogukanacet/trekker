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
import { buildPrismaWhereParams, type FilterFieldConfig } from "@/lib/build-prisma-where";
import { buildOrderBy } from "@/lib/build-order-by";
import { AddVehicleDialog } from "@/app/[locale]/(dashboard)/vehicles/AddVehicleDialog";
import VehicleRow from "@/app/[locale]/(dashboard)/vehicles/VehicleRow";
import { getTranslations } from "next-intl/server";

const VehiclesPage = async ({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    model?: string;
    depotId?: string;
    sortBy?: string;
    sortOrder?: string;
    insuranceUntilFrom?: string;
    insuranceUntilTo?: string;
    inspectionUntilFrom?: string;
    inspectionUntilTo?: string;
  }>;
}) => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const params = await searchParams;
  const { depotId, sortBy, sortOrder } = params;

  const vehicleSortKeys = ["plate", "model", "insuranceUntil", "inspectionUntil"] as const;

  const vehicleFilters: FilterFieldConfig[] = [
    { key: "q", field: "plate", type: "text" },
    { key: "model", field: "model", type: "text" },
    { key: "insuranceUntil", field: "insuranceUntil", type: "dateRange" },
    { key: "inspectionUntil", field: "inspectionUntil", type: "dateRange" },
  ];

  const depotList = await prisma.depot.findMany({ where: { tenantId } });

  const vehicleList = await prisma.vehicle.findMany({
    where: {
      depot: { tenantId, ...(depotId ? { id: depotId } : {}) },
      ...buildPrismaWhereParams(params, vehicleFilters),
    },
    orderBy: buildOrderBy(vehicleSortKeys, sortBy, sortOrder),
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
        <div />
        <AddVehicleDialog depotList={depotList} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <ColumnHeader
                label={t("plate")}
                sortKey="plate"
                filter={{ type: "text", key: "q", placeholder: common("searchByPlatePlaceholder") }}
              />
            </TableHead>
            <TableHead>
              <ColumnHeader
                label={t("model")}
                sortKey="model"
                filter={{ type: "text", key: "model", placeholder: common("searchPlaceholder") }}
              />
            </TableHead>
            <TableHead>
              <ColumnHeader
                label={t("depot")}
                sortKey="depotId"
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
                label={t("insuranceUntil")}
                sortKey="insuranceUntil"
                filter={{
                  type: "date-range",
                  key: "insuranceUntil",
                  fromLabel: common("startDate"),
                  toLabel: common("endDate"),
                }}
              />
            </TableHead>
            <TableHead>
              <ColumnHeader
                label={t("inspectionUntil")}
                sortKey="inspectionUntil"
                filter={{
                  type: "date-range",
                  key: "inspectionUntil",
                  fromLabel: common("startDate"),
                  toLabel: common("endDate"),
                }}
              />
            </TableHead>
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
