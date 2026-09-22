"use client";

import { useActionState, useEffect, useState } from "react";
import type { Vehicle, Depot } from "@prisma/client";
import * as vehicleActions from "@/app/[locale]/(dashboard)/vehicles/actions";
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
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function VehicleActionsCell({
  vehicle,
  depotList,
}: {
  vehicle: Vehicle;
  depotList: Depot[];
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const t = useTranslations("Vehicles");
  const common = useTranslations("Common");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [actionState, formAction, isPending] = useActionState(
    vehicleActions.updateVehicle.bind(null, vehicle.id),
    { error: null, success: false },
  );
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (actionState.success) {
      toast.success(t("updated"));
      setIsEditOpen(false);
    }
  }, [actionState.success]);

  const handleDelete = async () => {
    setIsDeletePending(true);
    const result = await vehicleActions.deleteVehicle(vehicle.id, { error: null, success: false });
    setIsDeletePending(false);

    if (result.error) {
      setDeleteError(result.error);
    } else {
      toast.success(t("deleted"));
      setIsDeleteOpen(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-end gap-1">
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogTrigger render={<Button variant="ghost" size="icon" />}>
          <Pencil className="h-4 w-4" />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("edit")}</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`plate-${vehicle.id}`}>{t("plate")}</Label>
              <Input id={`plate-${vehicle.id}`} name="plate" defaultValue={vehicle.plate} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`model-${vehicle.id}`}>{t("model")}</Label>
              <Input id={`model-${vehicle.id}`} name="model" defaultValue={vehicle.model ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`insuranceUntil-${vehicle.id}`}>{t("insuranceUntil")}</Label>
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
              <Label htmlFor={`inspectionUntil-${vehicle.id}`}>{t("inspectionUntil")}</Label>
              <Input
                id={`inspectionUntil-${vehicle.id}`}
                name="inspectionUntil"
                type="date"
                defaultValue={
                  vehicle.inspectionUntil ? vehicle.inspectionUntil.toISOString().split("T")[0] : ""
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`depotId-${vehicle.id}`}>{t("depot")}</Label>
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
                {isPending ? common("updating") : common("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogTrigger render={<Button variant="ghost" size="icon" />}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", { plate: vehicle.plate })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleDelete();
            }}
          >
            <AlertDialogFooter>
              <AlertDialogCancel>{common("cancel")}</AlertDialogCancel>
              <Button
                type="submit"
                className="bg-destructive hover:bg-destructive/90"
                disabled={isDeletePending}
              >
                {isDeletePending ? common("deleting") : common("delete")}
              </Button>
            </AlertDialogFooter>
            {deleteError && <p className="text-sm text-destructive mt-2">{deleteError}</p>}
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
