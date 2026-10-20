"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import type { TranslationRow } from "@/lib/translations/catalog";
import { deleteCustomKey } from "@/app/[locale]/(dashboard)/translations/actions";

export function DeleteCustomKeyButton({ row }: { row: TranslationRow }) {
  const t = useTranslations("Translations");
  const common = useTranslations("Common");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCustomKey({ namespace: row.namespace, key: row.key });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("keyDeleted"));
      setIsOpen(false);
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger
        render={<Button variant="ghost" size="icon" aria-label={common("delete")} />}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteKeyTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="mb-2 block break-all font-mono text-xs">{row.id}</span>
            {t("deleteKeyDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{common("cancel")}</AlertDialogCancel>
          <Button
            type="button"
            className="bg-destructive hover:bg-destructive/90"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? common("deleting") : common("delete")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
