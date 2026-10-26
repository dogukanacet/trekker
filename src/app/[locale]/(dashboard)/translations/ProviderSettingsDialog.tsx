"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PROVIDER_LABELS, type ProviderId } from "@/lib/translations/providers/meta";
import {
  DEFAULT_PROVIDER_SETTINGS,
  readProviderSettings,
  writeProviderSettings,
  type ProviderSettings,
} from "@/app/[locale]/(dashboard)/translations/provider-settings";
import { getProviderOptions } from "@/app/[locale]/(dashboard)/translations/translate-actions";

type Option = { id: ProviderId; configured: boolean; detail: string | null };
type Loaded = { providers: Option[]; defaultId: ProviderId };

export function ProviderSettingsDialog() {
  const t = useTranslations("Translations");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<ProviderSettings>(DEFAULT_PROVIDER_SETTINGS);

  const describe = (id: ProviderId): string => {
    switch (id) {
      case "gemini":
        return t("providerDescGemini");
      case "cloudflare":
        return t("providerDescCloudflare");
      case "mymemory":
        return t("providerDescMymemory");
    }
  };

  const handleOpenChange = async (open: boolean) => {
    if (!open) return;

    setIsLoading(true);
    try {
      const result = await getProviderOptions();
      if (result.error || !result.providers || !result.defaultId) {
        toast.error(result.error ?? t("providerLoadFailed"));
        return;
      }

      // A stored choice the server no longer offers is dropped
      const configured = result.providers.filter((option) => option.configured);
      const stored = readProviderSettings();
      const normalized: ProviderSettings = {
        provider:
          stored.provider && configured.some((option) => option.id === stored.provider)
            ? stored.provider
            : null,
        fallback: stored.fallback && configured.length > 1,
      };
      setSettings(normalized);
      writeProviderSettings(normalized);
      setLoaded({ providers: result.providers, defaultId: result.defaultId });
    } catch {
      toast.error(t("providerLoadFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const update = (next: ProviderSettings) => {
    setSettings(next);
    writeProviderSettings(next);
  };

  const configuredCount = loaded?.providers.filter((option) => option.configured).length ?? 0;

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Settings className="mr-1 h-4 w-4" />
        {t("providerSettings")}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("providerTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{t("providerHint")}</p>

        {isLoading && !loaded && (
          <p className="text-sm text-muted-foreground">{t("providerLoading")}</p>
        )}

        {loaded && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-2 rounded-md border p-3">
                <input
                  type="radio"
                  name="translation-provider"
                  className="mt-1 accent-primary"
                  checked={settings.provider === null}
                  onChange={() => update({ ...settings, provider: null })}
                />
                <span className="text-sm font-medium">
                  {t("providerAuto", { name: PROVIDER_LABELS[loaded.defaultId] })}
                </span>
              </label>

              {loaded.providers.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-start gap-2 rounded-md border p-3 ${
                    option.configured ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                  }`}
                >
                  <input
                    type="radio"
                    name="translation-provider"
                    className="mt-1 accent-primary"
                    disabled={!option.configured}
                    checked={settings.provider === option.id}
                    onChange={() => update({ ...settings, provider: option.id })}
                  />
                  <span className="space-y-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{PROVIDER_LABELS[option.id]}</span>
                      {!option.configured && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {t("providerMissing")}
                        </span>
                      )}
                    </span>
                    {option.configured && option.detail && (
                      <span className="block break-all font-mono text-xs text-muted-foreground">
                        {t("providerModel", { model: option.detail })}
                      </span>
                    )}
                    <span className="block text-xs text-muted-foreground">
                      {describe(option.id)}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="provider-fallback"
                  checked={settings.fallback}
                  disabled={configuredCount < 2}
                  onCheckedChange={(checked) => update({ ...settings, fallback: checked === true })}
                />
                <Label htmlFor="provider-fallback" className="text-sm font-normal leading-snug">
                  {t("providerFallback")}
                </Label>
              </div>
              <p className="pl-6 text-xs text-muted-foreground">
                {configuredCount < 2 ? t("providerFallbackNeedsTwo") : t("providerFallbackHint")}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
