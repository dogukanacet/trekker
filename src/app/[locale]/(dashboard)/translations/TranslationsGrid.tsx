"use client";

import { useTranslations } from "next-intl";
import { DataGrid, type GridColumn, type DataGridPagination } from "@/components/data-grid";
import { routing } from "@/i18n/routing";
import type { TranslationRow } from "@/lib/translations/catalog";
import { effectiveValue, getRowStatus, type RowStatus } from "@/lib/translations/cell";
import { TranslationEditCell } from "@/app/[locale]/(dashboard)/translations/TranslationEditCell";

const statusClasses: Record<RowStatus, string> = {
  default: "bg-muted text-muted-foreground",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
};

const TranslationsGrid = ({
  rows,
  pagination,
}: {
  rows: TranslationRow[];
  pagination: DataGridPagination;
}) => {
  const t = useTranslations("Translations");
  const common = useTranslations("Common");

  const statusLabels: Record<RowStatus, string> = {
    default: t("statusDefault"),
    published: t("statusPublished"),
    draft: t("statusDraft"),
  };

  const localeColumns: GridColumn<TranslationRow>[] = routing.locales.map((locale) => ({
    colId: `locale-${locale}`,
    header: locale.toUpperCase(),
    render: (row) => {
      const cell = row.cells[locale];
      if (!cell) return common("notAvailable");
      const text = effectiveValue(cell);
      return (
        <span
          className={`block max-w-xs truncate ${cell.draft !== null ? "italic text-amber-700 dark:text-amber-400" : ""}`}
          title={text}
        >
          {text || common("notAvailable")}
        </span>
      );
    },
  }));

  const columns: GridColumn<TranslationRow>[] = [
    {
      colId: "namespace",
      header: t("namespace"),
      value: (row) => row.namespace,
      filter: "text",
      paramKey: "namespace",
      width: 150,
      filterParams: {
        placeholder: common("searchPlaceholder"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
    },
    {
      colId: "key",
      header: t("key"),
      value: (row) => row.key,
      filter: "text",
      paramKey: "q",
      filterParams: {
        placeholder: common("searchPlaceholder"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
    },
    ...localeColumns,
    {
      colId: "status",
      header: t("status"),
      width: 150,
      render: (row) => {
        const status = getRowStatus(row);
        return (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses[status]}`}>
            {statusLabels[status]}
          </span>
        );
      },
    },
    {
      colId: "actions",
      header: common("actions"),
      width: 90,
      render: (row) => <TranslationEditCell row={row} />,
    },
  ];

  return <DataGrid<TranslationRow> rowData={rows} columns={columns} pagination={pagination} />;
};

export default TranslationsGrid;
