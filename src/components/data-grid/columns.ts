import type { ReactNode } from "react";
import type { ColDef } from "ag-grid-community";
import type { FilterType } from "./filter-registry";
import type { GridFilterSyncConfig } from "./use-grid-query-sync";

export type GridColumn<T> = {
  colId: string;
  header: string;
  value?: (
    /** Raw value — used when reflecting sorting in the URL and matching filters. */
    row: T,
  ) => string | number | Date | null | undefined;
  render?: (
    /** Cell rendering. If omitted, the result of `value` is displayed as plain text. */
    row: T,
  ) => ReactNode;
  filter?: FilterType;
  filterParams?: Record<string, unknown>;
  width?: number;
  paramKey?: string; /** URL query parametresi anahtarı. Verilmezse colId kullanılır. */
  exportValue?: (
    /** Value used for export. If omitted, `value` is used; if both are missing, the column is excluded (e.g. actions). */
    row: T,
  ) => string | number | Date | null | undefined;
};

export function buildColumnDefs<T>(columns: GridColumn<T>[]): ColDef<T>[] {
  return columns.map((col): ColDef<T> => {
    const isSortable = !!col.value;

    const colDef: ColDef<T> = {
      colId: col.colId,
      headerName: col.header,
      width: col.width,
      sortable: isSortable,
      filter: col.filter ?? false,
      filterParams: col.filterParams,
    };

    // Sorting is cosmetic only: the actual order comes from the server (Prisma orderBy),
    // so disable AG Grid's client-side reordering.
    if (isSortable) {
      colDef.comparator = () => 0;
    }

    if (col.value) {
      colDef.valueGetter = ({ data }) => (data ? (col.value!(data) ?? undefined) : undefined);
      colDef.filterValueGetter = ({ data }) => (data ? (col.value!(data) ?? undefined) : undefined);
    }

    if (col.render) {
      colDef.cellRenderer = ({ data }: { data: T }) => (data ? col.render!(data) : null);
    }

    return colDef;
  });
}

export function deriveFilterSyncConfig<T>(columns: GridColumn<T>[]): GridFilterSyncConfig[] {
  return columns
    .filter((col) => !!col.filter)
    .map((col): GridFilterSyncConfig => {
      const paramKey = col.paramKey ?? col.colId;

      if (col.filter === "dateRange") {
        return {
          colId: col.colId,
          type: "dateRange",
          paramKeyFrom: `${paramKey}From`,
          paramKeyTo: `${paramKey}To`,
        };
      }
      if (col.filter === "multiselect") {
        return { colId: col.colId, type: "multiselect", paramKey };
      }
      return { colId: col.colId, type: "text", paramKey };
    });
}
