import { prisma } from "@/lib/prisma";
import DispatchGrid from "@/app/[locale]/(dashboard)/dispatches/DispatchGrid";
import { auth } from "@/lib/auth";
import { typography } from "@/lib/constants";
import { AddDispatchDialog } from "@/app/[locale]/(dashboard)/dispatches/AddDispatchDialog";
import { getTranslations } from "next-intl/server";
import {
  buildPrismaWhereParams,
  type FilterFieldConfig,
  SearchParamsFromFilters,
} from "@/lib/build-prisma-where";
import { buildOrderBy } from "@/lib/build-order-by";
import { parsePagination } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";

const dispatchFilters = [
  { key: "status", field: "status", type: "in" },
  { key: "date", field: "date", type: "dateRange" },
] as const satisfies FilterFieldConfig[];

const dispatchSortKeys = {
  status: "status",
  date: "date",
  vehiclePlate: ["vehicle", "plate"],
  driverName: ["driver", "fullName"],
  routeName: ["route", "name"],
} as const;

type DispatchFilterParams = SearchParamsFromFilters<typeof dispatchFilters>;

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

  const {
    depotId,
    vehiclePlate,
    driverName,
    routeName,
    sortBy,
    sortOrder,
    page: pageParam,
    pageSize: pageSizeParam,
    ...restParams
  } = await searchParams;

  const { page, pageSize, skip, take } = parsePagination({
    page: pageParam,
    pageSize: pageSizeParam,
  });

  const where: Prisma.DispatchWhereInput = {
    vehicle: {
      depot: { tenantId, ...(depotId ? { id: depotId } : {}) },
      ...(vehiclePlate ? { plate: { contains: vehiclePlate, mode: "insensitive" } } : {}),
    },
    ...(driverName ? { driver: { fullName: { contains: driverName, mode: "insensitive" } } } : {}),
    ...(routeName ? { route: { name: { contains: routeName, mode: "insensitive" } } } : {}),
    ...buildPrismaWhereParams(restParams as Record<string, string | undefined>, dispatchFilters),
  };

  const [vehicleList, driverList, routeList, dispatchList, totalCount] = await Promise.all([
    prisma.vehicle.findMany({ where: { depot: { tenantId } } }),
    prisma.driver.findMany({ where: { depot: { tenantId } } }),
    prisma.route.findMany({ where: { depot: { tenantId } } }),
    prisma.dispatch.findMany({
      where,
      include: { vehicle: true, driver: true, route: true },
      orderBy: buildOrderBy(dispatchSortKeys, sortBy, sortOrder),
      skip,
      take,
    }),
    prisma.dispatch.count({ where }),
  ]);
  const t = await getTranslations("Dispatches");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>{t("title")}</h1>
          <p className={typography.secondary}>{t("subtitle")}</p>
        </div>
        <AddDispatchDialog
          vehicleList={vehicleList}
          driverList={driverList}
          routeList={routeList}
        />
      </div>

      <DispatchGrid
        vehicleList={vehicleList}
        driverList={driverList}
        routeList={routeList}
        dispatches={dispatchList}
        pagination={{ page, pageSize, totalCount }}
      />
    </div>
  );
};

export default DispatchesPage;
