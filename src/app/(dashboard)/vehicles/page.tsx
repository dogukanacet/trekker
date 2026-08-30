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
import { AddVehicleDialog } from "@/app/(dashboard)/vehicles/AddVehicleDialog";
import VehicleRow from "@/app/(dashboard)/vehicles/VehicleRow";

const VehiclesPage = async () => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;

  const depotList = await prisma.depot.findMany({ where: { tenantId } });
  const vehicleList = await prisma.vehicle.findMany({ where: { depot: { tenantId } } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>Araçlar</h1>
          <p className={typography.secondary}>Filo araçlarını yönet.</p>
        </div>
        <AddVehicleDialog depotList={depotList} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plaka</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Depo</TableHead>
            <TableHead>Sigorta Bitiş</TableHead>
            <TableHead>Muayene Bitiş</TableHead>
            <TableHead className="text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicleList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className={`text-center py-8 ${typography.secondary}`}>
                Henüz araç eklenmemiş.
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
