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
import { AddDriverDialog } from "@/app/(dashboard)/drivers/AddDriverDialog";
import DriverRow from "@/app/(dashboard)/drivers/DriverRow";

const DriversPage = async () => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;

  const depotList = await prisma.depot.findMany({
    where: { tenantId },
  });
  const driverList = await prisma.driver.findMany({
    where: { depot: { tenantId } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>Sürücüler</h1>
          <p className={typography.secondary}>Filo sürücülerini yönet.</p>
        </div>
        <AddDriverDialog depotList={depotList} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ad Soyad</TableHead>
            <TableHead>Depo</TableHead>
            <TableHead>Ehliyet Bitiş</TableHead>
            <TableHead className="text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {driverList.length === 0 ? (
            <TableRow>
              <TableCell>Henüz sürücü eklenmemiş.</TableCell>
            </TableRow>
          ) : (
            driverList.map((driver) => (
              <DriverRow key={driver.id} driver={driver} depotList={depotList} />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default DriversPage;
