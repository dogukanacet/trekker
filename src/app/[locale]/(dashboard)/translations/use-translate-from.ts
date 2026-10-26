"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PROVIDER_LABELS } from "@/lib/translations/providers/meta";
import { readProviderSettings } from "@/app/[locale]/(dashboard)/translations/provider-settings";
import { translateToLocales } from "@/app/[locale]/(dashboard)/translations/translate-actions";

// Translates the text of one input into every other input of a dialog.
// Results only fill the inputs; nothing is saved until the user saves the dialog.
export function useTranslateFrom(
  locales: readonly string[],
  values: Record<string, string>,
  setValues: Dispatch<SetStateAction<Record<string, string>>>,
) {
  const t = useTranslations("Translations");
  const [translatingFrom, setTranslatingFrom] = useState<string | null>(null);

  const translateFrom = async (source: string) => {
    const text = (values[source] ?? "").trim();
    if (text === "") {
      toast.error(t("translateEmptySource"));
      return;
    }
    const targets = locales.filter((code) => code !== source);
    if (targets.length === 0) {
      toast.info(t("translateNoTargets"));
      return;
    }

    setTranslatingFrom(source);
    try {
      const settings = readProviderSettings();
      const result = await translateToLocales({
        text,
        from: source,
        to: targets,
        provider: settings.provider,
        fallback: settings.fallback,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }

      for (const change of result.switched ?? []) {
        toast.info(
          t("providerSwitched", {
            from: PROVIDER_LABELS[change.from],
            to: PROVIDER_LABELS[change.to],
          }),
        );
      }

      const translated = result.results ?? {};
      setValues((previous) => ({ ...previous, ...translated }));

      const failures = Object.entries(result.failures ?? {});
      if (failures.length > 0) {
        const details = failures
          .map(([code, message]) => `${code.toUpperCase()}: ${message}`)
          .join(" ");
        toast.warning(t("translatePartial", { details }));
      } else if (result.provider) {
        toast.success(t("translateDoneWith", { provider: PROVIDER_LABELS[result.provider] }));
      } else {
        toast.success(t("translateDone"));
      }
    } catch {
      toast.error(t("failUnavailable"));
    } finally {
      setTranslatingFrom(null);
    }
  };

  return { translateFrom, translatingFrom };
}
