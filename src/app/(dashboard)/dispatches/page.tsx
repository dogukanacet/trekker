import { prisma } from "@/lib/prisma";
import DispatchGrid from "@/app/(dashboard)/dispatches/DispatchGrid";
import { auth } from "@/lib/auth";
import { typography } from "@/lib/constants";
import { AddDispatchDialog } from "@/app/(dashboard)/dispatches/AddDispatchDialog";
import { Card, CardContent } from "@/components/ui/card";

const DispatchesPage = async () => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;

  const [vehicleList, driverList, routeList, dispatchList] = await Promise.all([
    prisma.vehicle.findMany({ where: { depot: { tenantId } } }),
    prisma.driver.findMany({ where: { depot: { tenantId } } }),
    prisma.route.findMany({ where: { depot: { tenantId } } }),
    prisma.dispatch.findMany({
      where: { vehicle: { depot: { tenantId } } },
      include: { vehicle: true, driver: true, route: true },
      orderBy: { date: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>Sevkiyatlar</h1>
          <p className={typography.secondary}>Araç, sürücü ve rota atamalarını yönet.</p>
        </div>
        <AddDispatchDialog
          vehicleList={vehicleList}
          driverList={driverList}
          routeList={routeList}
        />
      </div>
      <DispatchGrid dispatches={dispatchList} />
    </div>
  );
};

export default DispatchesPage;
