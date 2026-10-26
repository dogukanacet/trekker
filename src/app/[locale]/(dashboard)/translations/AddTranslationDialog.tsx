"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { routing } from "@/i18n/routing";
import { createKey } from "@/app/[locale]/(dashboard)/translations/actions";
import { TranslateButton } from "@/app/[locale]/(dashboard)/translations/TranslateButton";
import { useTranslateFrom } from "@/app/[locale]/(dashboard)/translations/use-translate-from";

export function AddTranslationDialog({
  namespaces,
  locales,
}: {
  namespaces: string[];
  locales: readonly string[];
}) {
  const t = useTranslations("Translations");
  const [isOpen, setIsOpen] = useState(false);
  const [namespace, setNamespace] = useState("");
  const [key, setKey] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { translateFrom, translatingFrom } = useTranslateFrom(locales, values, setValues);

  const handleOpenChange = (open: boolean) => {
    // Start from a clean form every time the dialog opens
    if (open) {
      setNamespace("");
      setKey("");
      setValues({});
      setError(null);
    }
    setIsOpen(open);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createKey({ namespace, key, values });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(t("keyCreated"));
      setIsOpen(false);
    });
  };

  const isBusy = isPending || translatingFrom !== null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Plus className="mr-1 h-4 w-4" />
        {t("addKey")}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{t("addHint")}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-namespace">{t("namespace")}</Label>
            <Input
              id="new-namespace"
              list="translation-namespaces"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              placeholder={t("namespacePlaceholder")}
              autoComplete="off"
            />
            <datalist id="translation-namespaces">
              {namespaces.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-key">{t("key")}</Label>
            <Input
              id="new-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={t("keyPlaceholder")}
              autoComplete="off"
            />
          </div>

          {locales.map((locale) => (
            <div key={locale} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`new-value-${locale}`}>
                  {locale.toUpperCase()}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({locale === routing.defaultLocale ? t("required") : t("optionalFallback")})
                  </span>
                </Label>
                <TranslateButton
                  onClick={() => translateFrom(locale)}
                  disabled={isBusy || locales.length < 2}
                  loading={translatingFrom === locale}
                />
              </div>
              <textarea
                id={`new-value-${locale}`}
                value={values[locale] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [locale]: e.target.value }))}
                className="min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
          ))}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isBusy}>
              {t("createKey")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
