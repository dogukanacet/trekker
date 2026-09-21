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

export function DriverActionsCell({ driver, depotList }: { driver: Driver; depotList: Depot[] }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const t = useTranslations("Drivers");
  const common = useTranslations("Common");
  const [actionState, formAction, isPending] = useActionState(
    driverActions.updateDriver.bind(null, driver.id),
    { error: null, success: false },
  );
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
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
    const result = await driverActions.deleteDriver(driver.id, { error: null, success: false });
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
              <Label htmlFor={`fullName-${driver.id}`}>{t("name")}</Label>
              <Input id={`fullName-${driver.id}`} name="fullName" defaultValue={driver.fullName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`licenseUntil-${driver.id}`}>{t("licenseUntil")}</Label>
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
              <Label htmlFor={`depotId-${driver.id}`}>{t("depot")}</Label>
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
              {t("deleteDescription", { name: driver.fullName })}
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
