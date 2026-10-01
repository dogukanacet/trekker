"use client";

import { useActionState, useEffect, useState } from "react";
import type { Role } from "@prisma/client";
import * as userActions from "@/app/[locale]/(dashboard)/users/actions";
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
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

type DriverOption = { id: string; fullName: string; userId: string | null };

export function AddUserDialog({ driverList }: { driverList: DriverOption[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<Role>("DISPATCHER");
  const t = useTranslations("Users");
  const common = useTranslations("Common");
  const [actionState, formAction, isPending] = useActionState(userActions.createUser, {
    error: null,
    success: false,
  });

  const availableDrivers = driverList.filter((d) => !d.userId);

  useEffect(() => {
    if (actionState.success) {
      toast.success(t("invited"));
      setIsOpen(false);
      setRole("DISPATCHER");
    }
  }, [actionState.success]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" />
        {t("add")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("add")}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">{t("role")}</Label>
            <Select name="role" value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger id="role">
                <SelectValue>{(value: Role) => t(value.toLowerCase())}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">{t("admin")}</SelectItem>
                <SelectItem value="DISPATCHER">{t("dispatcher")}</SelectItem>
                <SelectItem value="DRIVER">{t("driver")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "DRIVER" && (
            <div className="space-y-2">
              <Label htmlFor="driverId">{t("linkedDriver")}</Label>
              <Select name="driverId">
                <SelectTrigger id="driverId">
                  <SelectValue>
                    {(value: string) => availableDrivers.find((d) => d.id === value)?.fullName}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableDrivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("linkedDriverHint")}</p>
            </div>
          )}
          {actionState.error && <p className="text-sm text-destructive">{actionState.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? common("creating") : t("sendInvite")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
