"use client";

import { useActionState, useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function AddDepotDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("Depots");
  const common = useTranslations("Common");
  const [actionState, formAction, isPending] = useActionState(depotActions.createDepot, {
    error: null,
    success: false,
  });

  useEffect(() => {
    if (actionState.success) {
      toast.success(t("created"));
      setIsOpen(false);
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
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" name="name" />
          </div>
          {actionState.error && <p className="text-sm text-destructive">{actionState.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? common("creating") : common("add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
