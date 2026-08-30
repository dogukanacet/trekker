"use client";

import { useActionState, useEffect, useState } from "react";
import type { Driver, Depot } from "@prisma/client";
import * as driverActions from "@/app/(dashboard)/drivers/actions";
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

const DriverRow = ({ driver, depotList }: { driver: Driver; depotList: Depot[] }) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [actionState, formAction, isPending] = useActionState(
    driverActions.updateDriver.bind(null, driver.id),
    { error: null },
  );
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    driverActions.deleteDriver.bind(null, driver.id),
    { error: null },
  );

  useEffect(() => {
    if (!isPending && actionState.error === null) setIsEditOpen(false);
  }, [actionState, isPending]);

  const depotName = depotList.find((d) => d.id === driver.depotId)?.name ?? "—";

  return (
    <TableRow>
      <TableCell>{driver.fullName}</TableCell>
      <TableCell>{depotName}</TableCell>
      <TableCell>
        {driver.licenseUntil ? driver.licenseUntil.toLocaleDateString("tr") : "—"}
      </TableCell>
      <TableCell className="text-right space-x-2">
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger render={<Button variant="ghost" size="icon" />}>
            <Pencil className="h-4 w-4" />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sürücüyü Düzenle</DialogTitle>
            </DialogHeader>
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`fullName-${driver.id}`}>Ad Soyad</Label>
                <Input
                  id={`fullName-${driver.id}`}
                  name="fullName"
                  defaultValue={driver.fullName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`licenseUntil-${driver.id}`}>Ehliyet Bitiş Tarihi</Label>
                <Input
                  id={`licenseUntil-${driver.id}`}
                  name="licenseUntil"
                  type="date"
                  defaultValue={
                    driver.licenseUntil ? driver.licenseUntil.toISOString().split("T")[0] : ""
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`depotId-${driver.id}`}>Depo</Label>
                <Select name="depotId" defaultValue={driver.depotId}>
                  <SelectTrigger id={`depotId-${driver.id}`}>
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
              <AlertDialogTitle>Sürücüyü sil</AlertDialogTitle>
              <AlertDialogDescription>
                {driver.fullName} kalıcı olarak silinecek. Bu işlem geri alınamaz.
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

export default DriverRow;
