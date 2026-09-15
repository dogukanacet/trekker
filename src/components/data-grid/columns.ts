import type { ReactNode } from "react";
import type { ColDef } from "ag-grid-community";
import type { FilterType } from "./filter-registry";
import type { GridFilterSyncConfig } from "./use-grid-query-sync";

export type GridColumn<T> = {
  colId: string;
  header: string;
  value?: (
    row: T,
  ) =>
    | string
    | number
    | Date
    | null
    | undefined; /** Ham değer — sıralama URL'e yansıtılırken ve filtre eşleştirmesinde kullanılır. */
  render?: (
    row: T,
  ) => ReactNode; /** Hücrenin görseli. Verilmezse `value`'nun sonucu düz metin olarak gösterilir. */
  filter?: FilterType;
  filterParams?: Record<string, unknown>;
  width?: number;
  paramKey?: string; /** URL query parametresi anahtarı. Verilmezse colId kullanılır. */
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

    // Sıralama sadece kozmetik: gerçek sıra sunucudan (Prisma orderBy) geliyor,
    // AG Grid'in kendi client-side yeniden sıralamasını devre dışı bırakıyoruz.
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
