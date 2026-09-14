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

const dispatchFilters = [
  { key: "status", field: "status", type: "in" },
  { key: "date", field: "date", type: "dateRange" },
] as const satisfies FilterFieldConfig[];

const dispatchSortKeys = ["driverName", "vehiclePlate", "routeName", "status", "date"] as const;

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
    }
  >;
}) => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;

  const { depotId, vehiclePlate, driverName, routeName, sortBy, sortOrder, ...restParams } =
    await searchParams;

  const [vehicleList, driverList, routeList, dispatchList] = await Promise.all([
    prisma.vehicle.findMany({ where: { depot: { tenantId } } }),
    prisma.driver.findMany({ where: { depot: { tenantId } } }),
    prisma.route.findMany({ where: { depot: { tenantId } } }),
    prisma.dispatch.findMany({
      where: {
        vehicle: {
          depot: { tenantId, ...(depotId ? { id: depotId } : {}) },
          ...(vehiclePlate ? { plate: { contains: vehiclePlate, mode: "insensitive" } } : {}),
        },
        ...(driverName
          ? { driver: { fullName: { contains: driverName, mode: "insensitive" } } }
          : {}),
        ...(routeName ? { route: { name: { contains: routeName, mode: "insensitive" } } } : {}),
        ...buildPrismaWhereParams(
          restParams as Record<string, string | undefined>,
          dispatchFilters,
        ),
      },
      include: { vehicle: true, driver: true, route: true },
      orderBy: buildOrderBy(dispatchSortKeys, sortBy, sortOrder),
    }),
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
      />
    </div>
  );
};

export default DispatchesPage;
