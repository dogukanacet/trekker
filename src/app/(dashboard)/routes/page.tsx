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
import { AddRouteDialog } from "@/app/(dashboard)/routes/AddRouteDialog";
import RouteRow from "@/app/(dashboard)/routes/RouteRow";

const RoutesPage = async () => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;

  const depotList = await prisma.depot.findMany({ where: { tenantId } });
  const routeList = await prisma.route.findMany({ where: { depot: { tenantId } } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>Rotalar</h1>
          <p className={typography.secondary}>Depo rotalarını yönet.</p>
        </div>
        <AddRouteDialog depotList={depotList} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rota Adı</TableHead>
            <TableHead>Depo</TableHead>
            <TableHead>Oluşturulma Tarihi</TableHead>
            <TableHead className="text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {routeList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className={`text-center py-8 ${typography.secondary}`}>
                Henüz rota eklenmemiş.
              </TableCell>
            </TableRow>
          ) : (
            routeList.map((route) => (
              <RouteRow key={route.id} route={route} depotList={depotList} />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default RoutesPage;
