import { prisma } from "@/lib/prisma";
import DispatchGrid from "@/app/[locale]/(dashboard)/dispatches/DispatchGrid";
import { auth } from "@/lib/auth";
import { typography } from "@/lib/constants";
import { AddDispatchDialog } from "@/app/[locale]/(dashboard)/dispatches/AddDispatchDialog";
import { getTranslations } from "next-intl/server";
import { parsePagination } from "@/lib/pagination";
import { hasPermission } from "@/lib/permissions";
import {
  buildDispatchWhere,
  getDispatchRows,
  type DispatchFilterParams,
} from "@/app/[locale]/(dashboard)/dispatches/query";
import type { Vehicle, Driver, Route } from "@prisma/client";

const DispatchesPage = async ({
  searchParams,
}: {
  searchParams: Promise<
    DispatchFilterParams & {
      depotId?: string;
      vehiclePlate?: string;
      driverName?: string;
      routeName?: string;
      sortBy?: string;
      sortOrder?: string;
      page?: string;
      pageSize?: string;
    }
  >;
}) => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const role = session?.user?.role;
  const scope = { tenantId, role, driverId: session?.user?.driverId };
  const canManage = hasPermission(role, "dispatches", "update");

  const params = (await searchParams) as Record<string, string | undefined>;

  const { page, pageSize, skip, take } = parsePagination({
    page: params.page,
    pageSize: params.pageSize,
  });

  const [vehicleList, driverList, routeList, dispatchList, totalCount] = await Promise.all([
    canManage
      ? prisma.vehicle.findMany({ where: { depot: { tenantId } } })
      : Promise.resolve<Vehicle[]>([]),
    canManage
      ? prisma.driver.findMany({ where: { depot: { tenantId } } })
      : Promise.resolve<Driver[]>([]),
    canManage
      ? prisma.route.findMany({ where: { depot: { tenantId } } })
      : Promise.resolve<Route[]>([]),
    getDispatchRows(params, scope, { skip, take }),
    prisma.dispatch.count({ where: buildDispatchWhere(params, scope) }),
  ]);
  const t = await getTranslations("Dispatches");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>{t("title")}</h1>
          <p className={typography.secondary}>{t("subtitle")}</p>
        </div>
        {canManage && (
          <AddDispatchDialog
            vehicleList={vehicleList}
            driverList={driverList}
            routeList={routeList}
          />
        )}
      </div>

      <DispatchGrid
        vehicleList={vehicleList}
        driverList={driverList}
        routeList={routeList}
        dispatches={dispatchList}
        pagination={{ page, pageSize, totalCount }}
        canManage={canManage}
      />
    </div>
  );
};

export default DispatchesPage;
