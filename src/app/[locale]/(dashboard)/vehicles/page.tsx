import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { typography } from "@/lib/constants";
import { parsePagination } from "@/lib/pagination";
import { AddVehicleDialog } from "@/app/[locale]/(dashboard)/vehicles/AddVehicleDialog";
import VehicleGrid from "@/app/[locale]/(dashboard)/vehicles/VehicleGrid";
import { buildVehicleWhere, getVehicleRows } from "@/app/[locale]/(dashboard)/vehicles/query";
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

  const [depotList, vehicleList, totalCount] = await Promise.all([
    prisma.depot.findMany({ where: { tenantId } }),
    getVehicleRows(params, tenantId, { skip, take }),
    prisma.vehicle.count({ where: buildVehicleWhere(params, tenantId) }),
  ]);
  const t = await getTranslations("Vehicles");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>{t("title")}</h1>
          <p className={typography.secondary}>{t("subtitle")}</p>
        </div>
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
