"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadCsv, downloadPdf } from "@/lib/export/client";
import type { ExportPayload } from "@/lib/export/payload";

type ExportFormat = "csv" | "pdf";

export function ExportButtons({ resource }: { resource: string }) {
  const t = useTranslations("Common");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setActiveFormat(format);
    try {
      // Filtre/sıralama URL'de zaten var; sadece sayfalamayı çıkarıp locale'i ekliyoruz.
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      params.delete("pageSize");
      params.set("locale", locale);

      const response = await fetch(`/api/export/${resource}?${params.toString()}`);
      if (!response.ok) throw new Error(`Export failed: ${response.status}`);
      const payload = (await response.json()) as ExportPayload;

      if (format === "csv") {
        downloadCsv(payload, resource, locale);
      } else {
        await downloadPdf(
          payload,
          resource,
          locale,
          t("generatedAt", { date: new Date().toLocaleString(locale) }),
        );
      }
    } catch {
      toast.error(t("exportFailed"));
    } finally {
      setActiveFormat(null);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {(["csv", "pdf"] as const).map((format) => (
        <Button
          key={format}
          variant="outline"
          size="sm"
          disabled={activeFormat !== null}
          aria-label={t(format === "csv" ? "exportCsv" : "exportPdf")}
          onClick={() => handleExport(format)}
        >
          {activeFormat === format ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {format.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
