"use client";

import { useActionState, useEffect, useState } from "react";
import type { Depot } from "@prisma/client";
import * as depotActions from "@/app/[locale]/(dashboard)/depots/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function DepotActionsCell({ depot }: { depot: Depot }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const t = useTranslations("Depots");
  const common = useTranslations("Common");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [actionState, formAction, isPending] = useActionState(
    depotActions.updateDepot.bind(null, depot.id),
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
    const result = await depotActions.deleteDepot(depot.id, { error: null, success: false });
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
              <Label htmlFor={`name-${depot.id}`}>{t("name")}</Label>
              <Input id={`name-${depot.id}`} name="name" defaultValue={depot.name} />
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
              {t("deleteDescription", { name: depot.name })}
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
