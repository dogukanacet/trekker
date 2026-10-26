"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Sparkles } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { routing } from "@/i18n/routing";
import { downloadJson } from "@/lib/translations/download";
import { PROVIDER_LABELS, type ProviderId } from "@/lib/translations/providers/meta";
import { readProviderSettings } from "@/app/[locale]/(dashboard)/translations/provider-settings";
import {
  getBulkWorklist,
  translateChunk,
} from "@/app/[locale]/(dashboard)/translations/translate-actions";
import { importTranslations } from "@/app/[locale]/(dashboard)/translations/transfer-actions";

const CHUNK_SIZE = 10;

type Phase = "idle" | "preparing" | "running" | "done";

type Summary = {
  translated: number;
  failed: number;
  unsupported: number;
  alreadyTranslated: number;
  stopped: boolean;
};

export function BulkTranslateDialog({ enabledLocales }: { enabledLocales: readonly string[] }) {
  const t = useTranslations("Translations");
  const uiLocale = useLocale();
  const names = new Intl.DisplayNames([uiLocale], { type: "language" });
  const nameOf = (code: string) => `${names.of(code) ?? code} (${code.toUpperCase()})`;
  const firstOtherThan = (code: string) => routing.locales.find((c) => c !== code) ?? code;

  const [source, setSource] = useState<string>(routing.defaultLocale);
  const [target, setTarget] = useState<string>(() => firstOtherThan(routing.defaultLocale));
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failures, setFailures] = useState<{ id: string; reason: string }[]>([]);
  const [usedProviders, setUsedProviders] = useState<ProviderId[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Translations of the last run, keyed by "Namespace.key"
  const resultsRef = useRef<Record<string, string>>({});
  const cancelRef = useRef(false);

  const isBusy = phase === "preparing" || phase === "running";

  const changeSource = (value: string) => {
    setSource(value);
    if (value === target) setTarget(firstOtherThan(value));
  };
  const changeTarget = (value: string) => {
    setTarget(value);
    if (value === source) setSource(firstOtherThan(value));
  };

  const start = async () => {
    setPhase("preparing");
    setSummary(null);
    setFailures([]);
    setUsedProviders([]);
    setProgress({ done: 0, total: 0 });
    setResultCount(0);
    resultsRef.current = {};
    cancelRef.current = false;

    let worklist: Awaited<ReturnType<typeof getBulkWorklist>>;
    try {
      worklist = await getBulkWorklist({ source, target, onlyMissing });
    } catch {
      toast.error(t("failUnavailable"));
      setPhase("idle");
      return;
    }
    if (worklist.error || !worklist.items) {
      toast.error(worklist.error ?? t("invalidInput"));
      setPhase("idle");
      return;
    }

    const items = worklist.items;
    const skipped = {
      unsupported: worklist.unsupported ?? 0,
      alreadyTranslated: worklist.alreadyTranslated ?? 0,
    };
    if (items.length === 0) {
      setSummary({ translated: 0, failed: 0, ...skipped, stopped: false });
      setPhase("done");
      return;
    }

    setPhase("running");
    setProgress({ done: 0, total: items.length });

    const settings = readProviderSettings();
    // After a switch the run continues with the service that took over, so the one that
    // ran out of quota is not asked again for every chunk
    let activeProvider: string | null = settings.provider;
    const used = new Set<ProviderId>();

    let translated = 0;
    let failed = 0;
    let stopped = false;
    const failureList: { id: string; reason: string }[] = [];

    for (let index = 0; index < items.length; index += CHUNK_SIZE) {
      if (cancelRef.current) break;

      let result: Awaited<ReturnType<typeof translateChunk>>;
      try {
        result = await translateChunk({
          from: source,
          to: target,
          items: items.slice(index, index + CHUNK_SIZE),
          provider: activeProvider,
          fallback: settings.fallback,
        });
      } catch {
        stopped = true;
        break;
      }
      if (result.error) {
        toast.error(result.error);
        stopped = true;
        break;
      }

      if (result.provider) {
        used.add(result.provider);
        activeProvider = result.provider;
      }
      for (const change of result.switched ?? []) {
        toast.info(
          t("providerSwitched", {
            from: PROVIDER_LABELS[change.from],
            to: PROVIDER_LABELS[change.to],
          }),
        );
      }

      Object.assign(resultsRef.current, result.results ?? {});
      translated += Object.keys(result.results ?? {}).length;
      failed += result.failed?.length ?? 0;
      failureList.push(...(result.failed ?? []));
      setProgress({ done: Math.min(index + CHUNK_SIZE, items.length), total: items.length });

      if (result.stopped) {
        stopped = true;
        break;
      }
    }

    setResultCount(Object.keys(resultsRef.current).length);
    setFailures(failureList.slice(0, 8));
    setUsedProviders([...used]);
    setSummary({ translated, failed, ...skipped, stopped });
    setPhase("done");
  };

  const saveAsDrafts = async () => {
    setIsSaving(true);
    try {
      const report = await importTranslations({
        data: { [target]: resultsRef.current },
        apply: true,
      });
      if (report.error) {
        toast.error(report.error);
        return;
      }
      toast.success(t("bulkSaved", { count: report.willUpdate ?? 0 }));
      if ((report.problemCount ?? 0) > 0) {
        toast.warning(t("bulkSavedSkipped", { count: report.problemCount ?? 0 }));
      }
    } catch {
      toast.error(t("failUnavailable"));
    } finally {
      setIsSaving(false);
    }
  };

  const download = () => {
    downloadJson(`translations-${target}.json`, { [target]: resultsRef.current });
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <Sparkles className="mr-1 h-4 w-4" />
        {t("bulkTranslate")}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("bulkTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{t("bulkHint")}</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>{t("bulkSource")}</Label>
            <Select
              value={source}
              onValueChange={(value) => value && changeSource(value)}
              disabled={isBusy}
            >
              <SelectTrigger>
                <SelectValue>{(value: string) => nameOf(value)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {routing.locales.map((code) => (
                  <SelectItem key={code} value={code}>
                    {nameOf(code)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("bulkTarget")}</Label>
            <Select
              value={target}
              onValueChange={(value) => value && changeTarget(value)}
              disabled={isBusy}
            >
              <SelectTrigger>
                <SelectValue>{(value: string) => nameOf(value)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {routing.locales.map((code) => (
                  <SelectItem key={code} value={code}>
                    {nameOf(code)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!enabledLocales.includes(target) && (
          <p className="text-xs text-muted-foreground">{t("bulkTargetDisabled")}</p>
        )}

        <div className="flex items-center gap-2">
          <Checkbox
            id="bulk-only-missing"
            checked={onlyMissing}
            disabled={isBusy}
            onCheckedChange={(checked) => setOnlyMissing(checked === true)}
          />
          <Label htmlFor="bulk-only-missing" className="text-sm font-normal">
            {t("bulkOnlyMissing")}
          </Label>
        </div>

        {phase === "preparing" && (
          <p className="text-sm text-muted-foreground">{t("bulkPreparing")}</p>
        )}

        {phase === "running" && (
          <div className="space-y-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("bulkProgress", { done: progress.done, total: progress.total })}
            </p>
          </div>
        )}

        {summary && (
          <div className="space-y-2 rounded-md border p-3 text-sm">
            {summary.translated + summary.failed === 0 && !summary.stopped ? (
              <p>{t("bulkNothing")}</p>
            ) : (
              <p>{t("bulkSummary", { translated: summary.translated, failed: summary.failed })}</p>
            )}
            {usedProviders.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("bulkProviders", {
                  providers: usedProviders.map((id) => PROVIDER_LABELS[id]).join(", "),
                })}
              </p>
            )}
            {(summary.unsupported > 0 || summary.alreadyTranslated > 0) && (
              <p className="text-xs text-muted-foreground">
                {t("bulkSkippedInfo", {
                  unsupported: summary.unsupported,
                  already: summary.alreadyTranslated,
                })}
              </p>
            )}
            {summary.stopped && (
              <p className="text-xs text-amber-700 dark:text-amber-400">{t("bulkStopped")}</p>
            )}
            {failures.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium">{t("bulkFailuresTitle")}</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {failures.map((failure) => (
                    <li key={failure.id} className="break-all">
                      <span className="font-mono">{failure.id}</span>: {failure.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {phase === "running" ? (
            <Button type="button" variant="outline" onClick={() => (cancelRef.current = true)}>
              {t("bulkCancel")}
            </Button>
          ) : (
            <Button type="button" onClick={start} disabled={isBusy}>
              {t("bulkStart")}
            </Button>
          )}
          {phase === "done" && resultCount > 0 && (
            <>
              <Button type="button" variant="outline" onClick={download}>
                <Download className="mr-1 h-4 w-4" />
                {t("bulkDownload")}
              </Button>
              <Button type="button" onClick={saveAsDrafts} disabled={isSaving}>
                {t("bulkSaveDrafts")}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
