"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
import { publishAll } from "@/app/[locale]/(dashboard)/translations/actions";

export function PublishButton({ draftCount }: { draftCount: number }) {
  const t = useTranslations("Translations");
  const common = useTranslations("Common");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handlePublish = () => {
    startTransition(async () => {
      const result = await publishAll();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("publishedCount", { count: result.count ?? 0 }));
      setIsOpen(false);
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger render={<Button disabled={draftCount === 0} />}>
        {draftCount > 0 ? t("publishWithCount", { count: draftCount }) : t("publish")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("publishTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("publishDescription", { count: draftCount })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{common("cancel")}</AlertDialogCancel>
          <Button type="button" onClick={handlePublish} disabled={isPending}>
            {isPending ? common("updating") : t("publish")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
