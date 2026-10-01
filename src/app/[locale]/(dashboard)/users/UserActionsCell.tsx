"use client";

import { useActionState, useEffect, useState } from "react";
import type { User, Role } from "@prisma/client";
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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

type UserRow = User & { driver: { id: string; fullName: string } | null };
type DriverOption = { id: string; fullName: string; userId: string | null };

export function UserActionsCell({
  user,
  driverList,
  currentUserId,
}: {
  user: UserRow;
  driverList: DriverOption[];
  currentUserId: string;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [role, setRole] = useState<Role>(user.role);
  const t = useTranslations("Users");
  const common = useTranslations("Common");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [actionState, formAction, isPending] = useActionState(
    userActions.updateUser.bind(null, user.id),
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
    const result = await userActions.deleteUser(user.id, { error: null, success: false });
    setIsDeletePending(false);

    if (result.error) {
      setDeleteError(result.error);
    } else {
      toast.success(t("deleted"));
      setIsDeleteOpen(false);
    }
  };

  const availableDrivers = driverList.filter((d) => !d.userId || d.userId === user.id);
  const isSelf = user.id === currentUserId;

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
              <Label htmlFor={`role-${user.id}`}>{t("role")}</Label>
              <Select name="role" value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger id={`role-${user.id}`}>
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
                <Label htmlFor={`driverId-${user.id}`}>{t("linkedDriver")}</Label>
                <Select name="driverId" defaultValue={user.driver?.id}>
                  <SelectTrigger id={`driverId-${user.id}`}>
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
              </div>
            )}
            {actionState.error && <p className="text-sm text-destructive">{actionState.error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? common("updating") : common("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {!isSelf && (
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogTrigger render={<Button variant="ghost" size="icon" />}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteDescription", { email: user.email })}
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
      )}
    </div>
  );
}
