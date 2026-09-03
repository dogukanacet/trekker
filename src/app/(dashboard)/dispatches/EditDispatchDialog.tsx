"use client";

import { useActionState, useEffect } from "react";
import type { Vehicle, Driver, Route, Dispatch, DispatchStatus } from "@prisma/client";
import * as dispatchActions from "@/app/(dashboard)/dispatches/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type DispatchRow = Dispatch & {
  vehicle?: { plate: string } | null;
  driver?: { fullName: string } | null;
  route?: { name: string } | null;
};

const statusLabels: Record<DispatchStatus, string> = {
  PLANNED: "Planlandı",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
};

export function EditDispatchDialog({
  dispatch,
  open,
  onOpenChange,
  vehicleList,
  driverList,
  routeList,
}: {
  dispatch: DispatchRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleList: Vehicle[];
  driverList: Driver[];
  routeList: Route[];
}) {
  const [actionState, formAction, isPending] = useActionState(
    dispatchActions.updateDispatch.bind(null, dispatch.id),
    { error: null, success: false },
  );

  useEffect(() => {
    if (actionState.success) {
      toast.success("Sevkiyat güncellendi");
      onOpenChange(false);
    }
  }, [actionState.success]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sevkiyatı Düzenle</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Araç</Label>
            <Select name="vehicleId" defaultValue={dispatch.vehicleId}>
              <SelectTrigger id="vehicleId">
                <SelectValue>
                  {(value: string) => {
                    const vehicle = vehicleList.find((v) => v.id === value);
                    return vehicle ? `${vehicle.plate} — ${vehicle.model ?? ""}` : "";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {vehicleList.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} — {vehicle.model ?? "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="driverId">Sürücü</Label>
            <Select name="driverId" defaultValue={dispatch.driverId}>
              <SelectTrigger id="driverId">
                <SelectValue>
                  {(value: string) => driverList.find((d) => d.id === value)?.fullName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {driverList.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="routeId">Rota</Label>
            <Select name="routeId" defaultValue={dispatch.routeId}>
              <SelectTrigger id="routeId">
                <SelectValue>
                  {(value: string) => routeList.find((r) => r.id === value)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {routeList.map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    {route.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Durum</Label>
            <Select name="status" defaultValue={dispatch.status}>
              <SelectTrigger id="status">
                <SelectValue>{(value: DispatchStatus) => statusLabels[value]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
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
  );
}
