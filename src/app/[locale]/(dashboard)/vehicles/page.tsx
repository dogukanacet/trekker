import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { typography } from "@/lib/constants";
import { buildPrismaWhereParams, type FilterFieldConfig } from "@/lib/build-prisma-where";
import { buildOrderBy } from "@/lib/build-order-by";
import { parsePagination } from "@/lib/pagination";
import { AddVehicleDialog } from "@/app/[locale]/(dashboard)/vehicles/AddVehicleDialog";
import VehicleGrid from "@/app/[locale]/(dashboard)/vehicles/VehicleGrid";
import { getTranslations } from "next-intl/server";
import type { Prisma } from "@prisma/client";

const vehicleFilters: FilterFieldConfig[] = [
  { key: "q", field: "plate", type: "text" },
  { key: "model", field: "model", type: "text" },
  { key: "depotId", field: "depotId", type: "in" },
  { key: "insuranceUntil", field: "insuranceUntil", type: "dateRange" },
  { key: "inspectionUntil", field: "inspectionUntil", type: "dateRange" },
];

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
    page?: string;
    pageSize?: string;
  }>;
}) => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const params = await searchParams;

  const vehicleSortKeys = ["plate", "model", "insuranceUntil", "inspectionUntil"] as const;

  const { page, pageSize, skip, take } = parsePagination({
    page: params.page,
    pageSize: params.pageSize,
  });

  const where: Prisma.VehicleWhereInput = {
    depot: { tenantId },
    ...buildPrismaWhereParams(params, vehicleFilters),
  };

  const [depotList, vehicleList, totalCount] = await Promise.all([
    prisma.depot.findMany({ where: { tenantId } }),
    prisma.vehicle.findMany({
      where,
      orderBy: buildOrderBy(vehicleSortKeys, params.sortBy, params.sortOrder),
      skip,
      take,
    }),
    prisma.vehicle.count({ where }),
  ]);
  const t = await getTranslations("Vehicles");

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
      <VehicleGrid
        vehicleList={vehicleList}
        depotList={depotList}
        pagination={{ page, pageSize, totalCount }}
      />
    </div>
  );
};

export default VehiclesPage;
