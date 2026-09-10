import { prisma } from "@/lib/prisma";
import DispatchGrid from "@/app/[locale]/(dashboard)/dispatches/DispatchGrid";
import { auth } from "@/lib/auth";
import { typography } from "@/lib/constants";
import { AddDispatchDialog } from "@/app/[locale]/(dashboard)/dispatches/AddDispatchDialog";
import DispatchesFilterBar from "@/app/[locale]/(dashboard)/dispatches/DispatchesFilterBar";
import { getTranslations } from "next-intl/server";

const DispatchesPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; depotId?: string }>;
}) => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const { q, depotId } = await searchParams;

  const [vehicleList, driverList, routeList, depotList, dispatchList] = await Promise.all([
    prisma.vehicle.findMany({ where: { depot: { tenantId } } }),
    prisma.driver.findMany({ where: { depot: { tenantId } } }),
    prisma.route.findMany({ where: { depot: { tenantId } } }),
    prisma.depot.findMany({ where: { tenantId } }),
    prisma.dispatch.findMany({
      where: {
        vehicle: { depot: { tenantId, ...(depotId ? { id: depotId } : {}) } },
        ...(q
          ? {
              OR: [
                { vehicle: { plate: { contains: q, mode: "insensitive" } } },
                { driver: { fullName: { contains: q, mode: "insensitive" } } },
                { route: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: { vehicle: true, driver: true, route: true },
      orderBy: { date: "desc" },
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
      </div>
      <div className="flex items-center justify-between">
        <DispatchesFilterBar depotList={depotList} />
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
