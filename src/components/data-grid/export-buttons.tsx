"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildExportTable, downloadCsv, downloadPdf } from "@/lib/export/client";
import type { GridColumn } from "./columns";
import type { DataGridExportOptions } from "./data-grid";

type ExportFormat = "csv" | "pdf";

export function ExportButtons<T>({
  resource,
  title,
  columns,
}: DataGridExportOptions & { columns: GridColumn<T>[] }) {
  const t = useTranslations("Common");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setActiveFormat(format);
    try {
      // Filters and sorting are already in the URL; remove only pagination.
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      params.delete("pageSize");

      const response = await fetch(`/api/export/${resource}?${params.toString()}`);
      if (!response.ok) throw new Error(`Export failed: ${response.status}`);
      const { rows } = (await response.json()) as { rows: T[] };

      const table = buildExportTable(title, columns, rows, locale);
      if (format === "csv") {
        downloadCsv(table, resource, locale);
      } else {
        await downloadPdf(
          table,
          resource,
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
          {t(format === "csv" ? "exportCsv" : "exportPdf")}
        </Button>
      ))}
    </div>
  );
}
