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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function VehicleQuickEditDialog({
  vehicle,
  depotList,
}: {
  vehicle: Vehicle;
  depotList: Depot[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("Vehicles");
  const common = useTranslations("Common");
  const [actionState, formAction, isPending] = useActionState(
    vehicleActions.updateVehicle.bind(null, vehicle.id),
    { error: null, success: false },
  );

  useEffect(() => {
    if (actionState.success) {
      toast.success(t("updated"));
      setIsOpen(false);
    }
  }, [actionState.success]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" />}>
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("edit")}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`qe-plate-${vehicle.id}`}>{t("plate")}</Label>
            <Input id={`qe-plate-${vehicle.id}`} name="plate" defaultValue={vehicle.plate} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`qe-model-${vehicle.id}`}>{t("model")}</Label>
            <Input id={`qe-model-${vehicle.id}`} name="model" defaultValue={vehicle.model ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`qe-insuranceUntil-${vehicle.id}`}>{t("insuranceUntil")}</Label>
            <Input
              id={`qe-insuranceUntil-${vehicle.id}`}
              name="insuranceUntil"
              type="date"
              defaultValue={
                vehicle.insuranceUntil ? vehicle.insuranceUntil.toISOString().split("T")[0] : ""
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`qe-inspectionUntil-${vehicle.id}`}>{t("inspectionUntil")}</Label>
            <Input
              id={`qe-inspectionUntil-${vehicle.id}`}
              name="inspectionUntil"
              type="date"
              defaultValue={
                vehicle.inspectionUntil ? vehicle.inspectionUntil.toISOString().split("T")[0] : ""
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`qe-depotId-${vehicle.id}`}>{t("depot")}</Label>
            <Select name="depotId" defaultValue={vehicle.depotId}>
              <SelectTrigger id={`qe-depotId-${vehicle.id}`}>
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
  );
}
