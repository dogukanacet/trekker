"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { routing } from "@/i18n/routing";
import type { TranslationRow } from "@/lib/translations/catalog";
import { effectiveValue } from "@/lib/translations/cell";
import * as translationActions from "@/app/[locale]/(dashboard)/translations/actions";

function buildInitialValues(row: TranslationRow): Record<string, string> {
  const values: Record<string, string> = {};
  for (const locale of routing.locales) {
    const cell = row.cells[locale];
    values[locale] = cell ? effectiveValue(cell) : "";
  }
  return values;
}

export function TranslationEditCell({ row }: { row: TranslationRow }) {
  const t = useTranslations("Translations");
  const common = useTranslations("Common");
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => buildInitialValues(row));
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (open: boolean) => {
    // Re-initialise on every open so stale edits never survive a cancel
    if (open) setValues(buildInitialValues(row));
    setIsOpen(open);
  };

  const handleSave = () => {
    startTransition(async () => {
      let changed = 0;

      for (const locale of routing.locales) {
        const cell = row.cells[locale];
        if (!cell || (cell.base === null && !row.isCustom)) continue;

        const next = values[locale] ?? "";
        if (next === effectiveValue(cell)) continue;

        const result = await translationActions.saveDraft({
          locale,
          namespace: row.namespace,
          key: row.key,
          value: next,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        changed++;
      }

      if (changed === 0) {
        toast.info(t("noChanges"));
        return;
      }
      toast.success(t("draftSaved"));
      setIsOpen(false);
    });
  };

  const handleDiscard = (locale: string) => {
    startTransition(async () => {
      const result = await translationActions.discardDraft({
        locale,
        namespace: row.namespace,
        key: row.key,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("draftDiscarded"));
      setIsOpen(false);
    });
  };

  return (
    <div className="flex h-full items-center justify-end">
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger render={<Button variant="ghost" size="icon" />}>
          <Pencil className="h-4 w-4" />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("edit")}</DialogTitle>
          </DialogHeader>
          <p className="break-all font-mono text-xs text-muted-foreground">{row.id}</p>
          <p className="text-xs text-muted-foreground">{t("placeholderHint")}</p>

          <div className="space-y-4">
            {routing.locales.map((locale) => {
              const cell = row.cells[locale];
              const isMissing = !cell || (cell.base === null && !row.isCustom);
              return (
                <div key={locale} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`tr-${row.id}-${locale}`}>{locale.toUpperCase()}</Label>
                    {cell?.draft != null && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleDiscard(locale)}
                      >
                        {t("discardDraft")}
                      </Button>
                    )}
                  </div>
                  {isMissing ? (
                    <p className="text-sm text-muted-foreground">{t("missingInLocale")}</p>
                  ) : (
                    <>
                      {cell.base !== null && (
                        <p className="text-xs text-muted-foreground">
                          {t("defaultValue")}: {cell.base}
                        </p>
                      )}
                      <textarea
                        id={`tr-${row.id}-${locale}`}
                        value={values[locale] ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({ ...prev, [locale]: e.target.value }))
                        }
                        className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button type="button" onClick={handleSave} disabled={isPending}>
              {isPending ? common("updating") : common("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
