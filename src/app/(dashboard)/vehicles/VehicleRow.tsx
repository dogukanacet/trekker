"use client";

import { useActionState, useEffect, useState } from "react";
import type { Vehicle, Depot } from "@prisma/client";
import * as vehicleActions from "@/app/(dashboard)/vehicles/actions";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";

const VehicleRow = ({ vehicle, depotList }: { vehicle: Vehicle; depotList: Depot[] }) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [actionState, formAction, isPending] = useActionState(
    vehicleActions.updateVehicle.bind(null, vehicle.id),
    { error: null },
  );

  const [deleteState, deleteAction, isDeletePending] = useActionState(
    vehicleActions.deleteVehicle.bind(null, vehicle.id),
    { error: null },
  );
  useEffect(() => {
    if (!isPending && actionState.error === null) setIsEditOpen(false);
  }, [actionState, isPending]);

  const depotName = depotList.find((d) => d.id === vehicle.depotId)?.name ?? "—";

  return (
    <TableRow>
      <TableCell>{vehicle.plate}</TableCell>
      <TableCell>{vehicle.model ?? "—"}</TableCell>
      <TableCell>{depotName}</TableCell>
      <TableCell>
        {vehicle.insuranceUntil ? vehicle.insuranceUntil.toLocaleDateString("tr") : "—"}
      </TableCell>
      <TableCell>
        {vehicle.inspectionUntil ? vehicle.inspectionUntil.toLocaleDateString("tr") : "—"}
      </TableCell>
      <TableCell className="text-right space-x-2">
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger render={<Button variant="ghost" size="icon" />}>
            <Pencil className="h-4 w-4" />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aracı Düzenle</DialogTitle>
            </DialogHeader>
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`plate-${vehicle.id}`}>Plaka</Label>
                <Input id={`plate-${vehicle.id}`} name="plate" defaultValue={vehicle.plate} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`model-${vehicle.id}`}>Model</Label>
                <Input id={`model-${vehicle.id}`} name="model" defaultValue={vehicle.model ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`insuranceUntil-${vehicle.id}`}>Sigorta Bitiş Tarihi</Label>
                <Input
                  id={`insuranceUntil-${vehicle.id}`}
                  name="insuranceUntil"
                  type="date"
                  defaultValue={
                    vehicle.insuranceUntil ? vehicle.insuranceUntil.toISOString().split("T")[0] : ""
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`inspectionUntil-${vehicle.id}`}>Muayene Bitiş Tarihi</Label>
                <Input
                  id={`inspectionUntil-${vehicle.id}`}
                  name="inspectionUntil"
                  type="date"
                  defaultValue={
                    vehicle.inspectionUntil
                      ? vehicle.inspectionUntil.toISOString().split("T")[0]
                      : ""
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`depotId-${vehicle.id}`}>Depo</Label>
                <Select name="depotId" defaultValue={vehicle.depotId}>
                  <SelectTrigger id={`depotId-${vehicle.id}`}>
                    <SelectValue>
                      {(value: string) => depotList.find((d) => d.id === value)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {depotList.map((depot) => (
                      <SelectItem key={depot.id} value={depot.id}>
                        {depot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {actionState.error && <p className="text-sm text-destructive">{actionState.error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Güncelleniyor..." : "Kaydet"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="ghost" size="icon" />}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aracı sil</AlertDialogTitle>
              <AlertDialogDescription>
                {vehicle.plate} kalıcı olarak silinecek. Bu işlem geri alınamaz.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Vazgeç</AlertDialogCancel>
              <form action={deleteAction}>
                <AlertDialogAction
                  type="submit"
                  className="bg-destructive"
                  disabled={isDeletePending}
                >
                  {isDeletePending ? "Siliniyor..." : "Sil"}
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
            {deleteState.error && (
              <p className="text-sm text-destructive mt-2">{deleteState.error}</p>
            )}
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
};

export default VehicleRow;
