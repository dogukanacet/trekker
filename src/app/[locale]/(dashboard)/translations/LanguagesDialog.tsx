"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LanguageStat } from "@/lib/translations/language-stats";
import { setLanguageEnabled } from "@/app/[locale]/(dashboard)/translations/actions";

export function LanguagesDialog({ languages }: { languages: LanguageStat[] }) {
  const t = useTranslations("Translations");
  const uiLocale = useLocale();
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Language names in the current UI language, e.g. "Almanca" / "German"
  const names = new Intl.DisplayNames([uiLocale], { type: "language" });

  const toggle = (code: string, enabled: boolean) => {
    setPendingCode(code);
    startTransition(async () => {
      const result = await setLanguageEnabled({ code, enabled });
      setPendingCode(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("languageUpdated"));
    });
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <Languages className="mr-1 h-4 w-4" />
        {t("languages")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("languagesTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{t("languagesHint")}</p>

        <ul className="space-y-3">
          {languages.map((language) => {
            const percent =
              language.total > 0 ? Math.round((language.translated / language.total) * 100) : 0;
            return (
              <li key={language.code} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {names.of(language.code) ?? language.code}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {language.code.toUpperCase()}
                    </span>
                    {language.isDefault && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        {t("defaultLanguage")}
                      </span>
                    )}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        language.enabled
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {language.enabled ? t("languageEnabled") : t("languageDisabled")}
                    </span>
                  </div>
                  {!language.isDefault && (
                    <Button
                      type="button"
                      size="sm"
                      variant={language.enabled ? "outline" : "default"}
                      disabled={isPending && pendingCode === language.code}
                      onClick={() => toggle(language.code, !language.enabled)}
                    >
                      {language.enabled ? t("disableLanguage") : t("enableLanguage")}
                    </Button>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    %{percent} ·{" "}
                    {t("translatedOf", { translated: language.translated, total: language.total })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
