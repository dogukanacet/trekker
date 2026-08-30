"use client";

import { useActionState, useEffect, useState } from "react";
import type { Vehicle, Driver, Route } from "@prisma/client";
import * as dispatchActions from "@/app/(dashboard)/dispatches/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

export function AddDispatchDialog({
  vehicleList,
  driverList,
  routeList,
}: {
  vehicleList: Vehicle[];
  driverList: Driver[];
  routeList: Route[];
}) {
  const [open, setOpen] = useState(false);
  const [actionState, formAction, isPending] = useActionState(dispatchActions.createDispatch, {
    error: null,
  });

  useEffect(() => {
    if (!isPending && actionState.error === null) setOpen(false);
  }, [isPending, actionState]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" />
        Sevkiyat Ekle
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Sevkiyat</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Araç</Label>
            <Select name="vehicleId" required>
              <SelectTrigger id="vehicleId">
                <SelectValue>
                  {(value: string | null) => {
                    const vehicle = vehicleList.find((v) => v.id === value);
                    return vehicle ? `${vehicle.plate} — ${vehicle.model ?? ""}` : "Araç seç";
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
            <Select name="driverId" required>
              <SelectTrigger id="driverId">
                <SelectValue>
                  {(value: string | null) =>
                    value ? driverList.find((d) => d.id === value)?.fullName : "Sürücü seç"
                  }
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
            <Select name="routeId" required>
              <SelectTrigger id="routeId">
                <SelectValue>
                  {(value: string | null) =>
                    value ? routeList.find((r) => r.id === value)?.name : "Rota seç"
                  }
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
          {actionState.error && <p className="text-sm text-destructive">{actionState.error}</p>}
          <DialogFooter>
            <Button type="submit">Ekle</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
