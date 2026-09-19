"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from "react";
import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import type { ColDef, GetRowIdParams, IsFullWidthRowParams } from "ag-grid-community";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildColumnDefs, deriveFilterSyncConfig, type GridColumn } from "./columns";
import { colorSchemeDark, themeQuartz } from "ag-grid-community";
import { useTheme } from "next-themes";
import { useGridQuerySync } from "./use-grid-query-sync";
import { filterRegistry, isRegisteredFilterType } from "./filter-registry";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { PaginationControls } from "./pagination-controls";

ModuleRegistry.registerModules([AllCommunityModule]);

const lightTheme = themeQuartz.withParams({
  accentColor: "#4f46e5",
  backgroundColor: "var(--card)",
  chromeBackgroundColor: "color-mix(in oklch, var(--muted) 50%, transparent)",
  foregroundColor: "var(--foreground)",
  borderColor: "var(--border)",
  headerTextColor: "var(--foreground)",
  rowHoverColor: "color-mix(in oklch, var(--muted) 50%, transparent)",
  borderRadius: 8,
  wrapperBorderRadius: 8,
});

const darkTheme = themeQuartz.withPart(colorSchemeDark).withParams({
  accentColor: "#818cf8",
  backgroundColor: "var(--card)",
  chromeBackgroundColor: "color-mix(in oklch, var(--muted) 50%, transparent)",
  foregroundColor: "var(--foreground)",
  borderColor: "var(--border)",
  headerTextColor: "var(--foreground)",
  rowHoverColor: "color-mix(in oklch, var(--muted) 50%, transparent)",
  borderRadius: 8,
  wrapperBorderRadius: 8,
});

type DetailRow = { __detail: true; parentId: string };
type DisplayRow<T> = T | DetailRow;

function isDetailRow<T>(row: DisplayRow<T>): row is DetailRow {
  return typeof row === "object" && row !== null && "__detail" in row;
}

function resolveColumnDefs<T>(columnDefs: ColDef<T>[]): ColDef<T>[] {
  return columnDefs.map((colDef) => {
    if (isRegisteredFilterType(colDef.filter)) {
      const { component, doesFilterPass } = filterRegistry[colDef.filter];
      return { ...colDef, filter: { component, doesFilterPass } };
    }
    return colDef;
  });
}

export type DataGridPagination = {
  page: number;
  pageSize: number;
  totalCount: number;
};

type DataGridProps<T> = Omit<AgGridReactProps<T>, "columnDefs"> & {
  columns: GridColumn<T>[];
  renderDetail?: (row: T) => ReactNode;
  getRowKey?: (row: T) => string;
  detailRowHeight?: number;
  singleExpand?: boolean;
  pagination?: DataGridPagination;
};

function DataGridInner<T>(
  {
    columns,
    rowData,
    renderDetail,
    getRowKey,
    detailRowHeight = 320,
    singleExpand = false,
    pagination,
    onGridReady,
    onSortChanged,
    onFilterChanged,
    ...props
  }: DataGridProps<T>,
  ref: React.ForwardedRef<AgGridReact<DisplayRow<T>>>,
) {
  const { resolvedTheme } = useTheme();
  const innerRef = useRef<AgGridReact<DisplayRow<T>>>(null);
  useImperativeHandle(ref, () => innerRef.current as AgGridReact<DisplayRow<T>>);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      if (singleExpand) return prev.has(id) ? new Set() : new Set([id]);
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const displayRowData = useMemo<DisplayRow<T>[]>(() => {
    const rows = (rowData as T[] | null | undefined) ?? [];
    if (!renderDetail || !getRowKey) return rows;

    const result: DisplayRow<T>[] = [];
    for (const row of rows) {
      result.push(row);
      const id = getRowKey(row);
      if (expandedIds.has(id)) result.push({ __detail: true, parentId: id });
    }
    return result;
  }, [rowData, expandedIds, renderDetail, getRowKey]);

  const filterSyncConfig = deriveFilterSyncConfig(columns);
  const { applyInitialState, handleSortChanged, handleFilterChanged } = useGridQuerySync(
    innerRef as unknown as React.RefObject<AgGridReact | null>,
    filterSyncConfig,
  );

  const baseColumnDefs = resolveColumnDefs(buildColumnDefs(columns)) as ColDef<DisplayRow<T>>[];

  const columnDefs = useMemo<ColDef<DisplayRow<T>>[]>(() => {
    if (!renderDetail || !getRowKey) return baseColumnDefs;

    const expanderColDef: ColDef<DisplayRow<T>> = {
      colId: "__expander",
      headerName: "",
      width: 40,
      minWidth: 40,
      maxWidth: 40,
      flex: 0,
      resizable: false,
      sortable: false,
      filter: false,
      cellStyle: { padding: 0 },
      cellRenderer: ({ data }: { data: DisplayRow<T> }) => {
        if (!data || isDetailRow(data)) return null;
        const id = getRowKey(data as T);
        const isOpen = expandedIds.has(id);
        return (
          <button
            type="button"
            onClick={() => toggleExpand(id)}
            className="flex h-full w-full items-center justify-center"
            aria-label={isOpen ? "Daralt" : "Genişlet"}
          >
            <ChevronRight
              style={{ width: 16, height: 16 }}
              className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
            />
          </button>
        );
      },
    };

    return [expanderColDef, ...baseColumnDefs];
  }, [baseColumnDefs, renderDetail, getRowKey, expandedIds]);

  const isFullWidthRow = renderDetail
    ? (params: IsFullWidthRowParams<DisplayRow<T>>) =>
        isDetailRow(params.rowNode.data as DisplayRow<T>)
    : undefined;

  const fullWidthCellRenderer = renderDetail
    ? ({ data }: { data: DisplayRow<T> }) => {
        if (!data || !isDetailRow(data)) return null;
        const rows = (rowData as T[] | null | undefined) ?? [];
        const parentRow = rows.find((row) => getRowKey!(row) === data.parentId);
        return parentRow ? <div className="p-3">{renderDetail(parentRow)}</div> : null;
      }
    : undefined;

  const getRowHeight = renderDetail
    ? (params: { data?: DisplayRow<T> }) =>
        params.data && isDetailRow(params.data) ? detailRowHeight : undefined
    : undefined;

  const getRowId =
    renderDetail && getRowKey
      ? (params: GetRowIdParams<DisplayRow<T>>) => {
          const data = params.data;
          return isDetailRow(data) ? `detail-${data.parentId}` : getRowKey(data as T);
        }
      : undefined;

  return (
    <div style={{ width: "100%" }}>
      <AgGridReact
        ref={innerRef}
        {...props}
        domLayout="autoHeight"
        theme={resolvedTheme === "dark" ? darkTheme : lightTheme}
        defaultColDef={{ flex: 1, ...props.defaultColDef }}
        enableFilterHandlers
        rowData={displayRowData}
        columnDefs={columnDefs}
        isFullWidthRow={isFullWidthRow}
        fullWidthCellRenderer={fullWidthCellRenderer}
        getRowHeight={getRowHeight}
        getRowId={getRowId}
        onGridReady={(event) => {
          applyInitialState();
          onGridReady?.(event);
        }}
        onSortChanged={(event) => {
          handleSortChanged();
          onSortChanged?.(event);
        }}
        onFilterChanged={(event) => {
          handleFilterChanged();
          onFilterChanged?.(event);
        }}
      />

      {pagination && <PaginationControls {...pagination} />}
    </div>
  );
}

export const DataGrid = forwardRef(DataGridInner) as <T>(
  props: DataGridProps<T> & { ref?: React.ForwardedRef<AgGridReact<DisplayRow<T>>> },
) => ReturnType<typeof DataGridInner>;
