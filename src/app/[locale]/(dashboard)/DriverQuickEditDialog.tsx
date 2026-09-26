"use client";

import { useActionState, useEffect, useState } from "react";
import type { Driver, Depot } from "@prisma/client";
import * as driverActions from "@/app/[locale]/(dashboard)/drivers/actions";
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

export function DriverQuickEditDialog({
  driver,
  depotList,
}: {
  driver: Driver;
  depotList: Depot[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("Drivers");
  const common = useTranslations("Common");
  const [actionState, formAction, isPending] = useActionState(
    driverActions.updateDriver.bind(null, driver.id),
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
            <Label htmlFor={`qe-fullName-${driver.id}`}>{t("name")}</Label>
            <Input id={`qe-fullName-${driver.id}`} name="fullName" defaultValue={driver.fullName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`qe-licenseUntil-${driver.id}`}>{t("licenseUntil")}</Label>
            <Input
              id={`qe-licenseUntil-${driver.id}`}
              name="licenseUntil"
              type="date"
              defaultValue={
                driver.licenseUntil ? driver.licenseUntil.toISOString().split("T")[0] : ""
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`qe-depotId-${driver.id}`}>{t("depot")}</Label>
            <Select name="depotId" defaultValue={driver.depotId}>
              <SelectTrigger id={`qe-depotId-${driver.id}`}>
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
