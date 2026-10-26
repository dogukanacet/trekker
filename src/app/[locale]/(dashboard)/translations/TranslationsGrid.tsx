"use client";

import { useTranslations } from "next-intl";
import { DataGrid, type GridColumn, type DataGridPagination } from "@/components/data-grid";
import type { TranslationRow } from "@/lib/translations/catalog";
import { effectiveValue, getRowStatus, type RowStatus } from "@/lib/translations/cell";
import { TranslationEditCell } from "@/app/[locale]/(dashboard)/translations/TranslationEditCell";
import { InlineTranslationCell } from "@/app/[locale]/(dashboard)/translations/InlineTranslationCell";
import { DeleteCustomKeyButton } from "@/app/[locale]/(dashboard)/translations/DeleteCustomKeyButton";

const statusClasses: Record<RowStatus, string> = {
  default: "bg-muted text-muted-foreground",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
};

const TranslationsGrid = ({
  rows,
  locales,
  pagination,
}: {
  rows: TranslationRow[];
  locales: readonly string[];
  pagination: DataGridPagination;
}) => {
  const t = useTranslations("Translations");
  const common = useTranslations("Common");

  const statusLabels: Record<RowStatus, string> = {
    default: t("statusDefault"),
    published: t("statusPublished"),
    draft: t("statusDraft"),
  };

  const textFilterParams = {
    placeholder: common("searchPlaceholder"),
    applyLabel: common("apply"),
    clearLabel: common("clear"),
  };

  const localeColumns: GridColumn<TranslationRow>[] = locales.map((locale) => ({
    colId: `locale-${locale}`,
    header: locale.toUpperCase(),
    // Raw value makes the column sortable; the server sorts by the same text the cell shows
    value: (row) => {
      const cell = row.cells[locale];
      return cell ? effectiveValue(cell) : "";
    },
    render: (row) => <InlineTranslationCell row={row} locale={locale} />,
  }));

  const columns: GridColumn<TranslationRow>[] = [
    {
      colId: "namespace",
      header: t("namespace"),
      value: (row) => row.namespace,
      filter: "text",
      paramKey: "namespace",
      width: 150,
      filterParams: textFilterParams,
    },
    {
      colId: "key",
      header: t("key"),
      value: (row) => row.key,
      filter: "text",
      paramKey: "key",
      filterParams: textFilterParams,
      render: (row) => (
        <span className="flex items-center gap-2">
          <span>{row.key}</span>
          {row.isCustom && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {t("customBadge")}
            </span>
          )}
        </span>
      ),
    },
    ...localeColumns,
    {
      colId: "status",
      header: t("status"),
      width: 150,
      value: (row) => getRowStatus(row),
      filter: "multiselect",
      filterParams: {
        options: (Object.keys(statusLabels) as RowStatus[]).map((status) => ({
          value: status,
          label: statusLabels[status],
        })),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
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
      width: 120,
      render: (row) => (
        <div className="flex h-full items-center justify-end gap-1">
          <TranslationEditCell row={row} locales={locales} />
          {row.isCustom && <DeleteCustomKeyButton row={row} />}
        </div>
      ),
    },
  ];

  return <DataGrid<TranslationRow> rowData={rows} columns={columns} pagination={pagination} />;
};

export default TranslationsGrid;
