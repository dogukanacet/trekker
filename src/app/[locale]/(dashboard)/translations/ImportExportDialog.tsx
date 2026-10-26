"use client";

import { useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, FileJson, Upload } from "lucide-react";
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
import { routing } from "@/i18n/routing";
import { downloadJson } from "@/lib/translations/download";
import {
  exportTranslations,
  importTranslations,
  type ImportReport,
} from "@/app/[locale]/(dashboard)/translations/transfer-actions";

// Server actions accept request bodies of 1 MB by default
const MAX_FILE_BYTES = 900_000;

export function ImportExportDialog({ enabledLocales }: { enabledLocales: readonly string[] }) {
  const t = useTranslations("Translations");
  const uiLocale = useLocale();
  const names = new Intl.DisplayNames([uiLocale], { type: "language" });
  const nameOf = (code: string) => `${names.of(code) ?? code} (${code.toUpperCase()})`;

  const [exportLocales, setExportLocales] = useState<Set<string>>(() => new Set(enabledLocales));
  const [isExporting, startExport] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pendingData, setPendingData] = useState<unknown>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [createKeys, setCreateKeys] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const toggleLocale = (code: string) => {
    setExportLocales((previous) => {
      const next = new Set(previous);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleExport = () => {
    startExport(async () => {
      try {
        const result = await exportTranslations({ locales: [...exportLocales] });
        if (result.error || !result.data) {
          toast.error(result.error ?? t("invalidInput"));
          return;
        }
        downloadJson(`translations-${new Date().toISOString().slice(0, 10)}.json`, result.data);
        toast.success(t("exportDone", { count: result.count ?? 0 }));
      } catch {
        toast.error(t("failUnavailable"));
      }
    });
  };

  const resetImport = () => {
    setFileName(null);
    setPendingData(null);
    setReport(null);
  };

  // Dry run: only reports what would happen
  const runPreview = async (data: unknown, create: boolean, name: string | null) => {
    setIsWorking(true);
    try {
      const result = await importTranslations({ data, apply: false, createKeys: create });
      if (result.error) {
        toast.error(result.error);
        resetImport();
        return;
      }
      setReport(result);
      setPendingData(data);
      setFileName(name);
    } catch {
      toast.error(t("failUnavailable"));
    } finally {
      setIsWorking(false);
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input so choosing the same file again still fires onChange
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      toast.error(t("importTooLarge"));
      return;
    }

    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      toast.error(t("importInvalidJson"));
      return;
    }

    await runPreview(data, createKeys, file.name);
  };

  // The report depends on this option, so it is recalculated when the option changes
  const handleCreateKeysChange = async (checked: boolean) => {
    setCreateKeys(checked);
    if (pendingData !== null) await runPreview(pendingData, checked, fileName);
  };

  const handleApply = async () => {
    setIsWorking(true);
    try {
      const result = await importTranslations({ data: pendingData, apply: true, createKeys });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("importApplied", { count: result.willUpdate ?? 0 }));
      resetImport();
    } catch {
      toast.error(t("failUnavailable"));
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <FileJson className="mr-1 h-4 w-4" />
        {t("transfer")}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("transferTitle")}</DialogTitle>
        </DialogHeader>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">{t("exportTitle")}</h3>
          <p className="text-xs text-muted-foreground">{t("exportHint")}</p>
          <div className="space-y-2">
            {routing.locales.map((code) => (
              <div key={code} className="flex items-center gap-2">
                <Checkbox
                  id={`export-${code}`}
                  checked={exportLocales.has(code)}
                  onCheckedChange={() => toggleLocale(code)}
                />
                <Label htmlFor={`export-${code}`} className="text-sm font-normal">
                  {nameOf(code)}
                </Label>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleExport}
            disabled={isExporting || exportLocales.size === 0}
          >
            <Download className="mr-1 h-4 w-4" />
            {t("exportDownload")}
          </Button>
        </section>

        <section className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-medium">{t("importTitle")}</h3>
          <p className="text-xs text-muted-foreground">{t("importHint")}</p>

          <div className="flex items-start gap-2">
            <Checkbox
              id="import-create-keys"
              checked={createKeys}
              disabled={isWorking}
              onCheckedChange={(checked) => handleCreateKeysChange(checked === true)}
            />
            <Label htmlFor="import-create-keys" className="text-sm font-normal leading-snug">
              {t("importCreateKeys")}
            </Label>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="outline"
            disabled={isWorking}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1 h-4 w-4" />
            {t("importChooseFile")}
          </Button>
          {fileName && <p className="break-all text-xs text-muted-foreground">{fileName}</p>}

          {report && (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              {(report.willUpdate ?? 0) > 0 ? (
                <p>{t("importReportUpdate", { count: report.willUpdate ?? 0 })}</p>
              ) : (
                <p>{t("importReportNothing")}</p>
              )}
              {(report.newKeys ?? 0) > 0 && (
                <p className="break-all text-xs">
                  {t("importReportNewKeys", {
                    count: report.newKeys ?? 0,
                    examples: (report.newKeyExamples ?? []).join(", "),
                  })}
                </p>
              )}
              {(report.unchanged ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("importReportUnchanged", { count: report.unchanged ?? 0 })}
                </p>
              )}
              {(report.unknownKeys ?? 0) > 0 && (
                <p className="break-all text-xs text-muted-foreground">
                  {t("importReportUnknownKeys", {
                    count: report.unknownKeys ?? 0,
                    examples: (report.unknownKeyExamples ?? []).join(", "),
                  })}
                </p>
              )}
              {(report.unknownLocales ?? []).length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("importReportUnknownLocales", {
                    locales: (report.unknownLocales ?? []).join(", "),
                  })}
                </p>
              )}
              {(report.problemCount ?? 0) > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium">
                    {t("importReportProblems", { count: report.problemCount ?? 0 })}
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {(report.problems ?? []).map((problem) => (
                      <li key={`${problem.locale}-${problem.id}`} className="break-all">
                        <span className="font-mono">
                          {problem.locale.toUpperCase()} {problem.id}
                        </span>
                        : {problem.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button
                type="button"
                onClick={handleApply}
                disabled={isWorking || (report.willUpdate ?? 0) === 0}
              >
                {t("importApply")}
              </Button>
            </div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
