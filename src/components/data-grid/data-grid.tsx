"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { buildColumnDefs, deriveFilterSyncConfig, type GridColumn } from "./columns";
import { colorSchemeDark, themeQuartz } from "ag-grid-community";
import { useTheme } from "next-themes";
import { useGridQuerySync } from "./use-grid-query-sync";
import { filterRegistry, isRegisteredFilterType } from "./filter-registry";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";

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

function resolveColumnDefs<T>(columnDefs: ColDef<T>[]): ColDef<T>[] {
  return columnDefs.map((colDef) => {
    if (isRegisteredFilterType(colDef.filter)) {
      const { component, doesFilterPass } = filterRegistry[colDef.filter];
      return { ...colDef, filter: { component, doesFilterPass } };
    }
    return colDef;
  });
}

type DataGridProps<T> = Omit<AgGridReactProps<T>, "columnDefs"> & {
  columns: GridColumn<T>[];
};

function DataGridInner<T>(
  { columns, onGridReady, onSortChanged, onFilterChanged, ...props }: DataGridProps<T>,
  ref: React.ForwardedRef<AgGridReact<T>>,
) {
  const { resolvedTheme } = useTheme();
  const innerRef = useRef<AgGridReact<T>>(null);
  useImperativeHandle(ref, () => innerRef.current as AgGridReact<T>);

  const filterSyncConfig = deriveFilterSyncConfig(columns);
  const { applyInitialState, handleSortChanged, handleFilterChanged } = useGridQuerySync(
    innerRef,
    filterSyncConfig,
  );

  const columnDefs = resolveColumnDefs(buildColumnDefs(columns));

  return (
    <div style={{ height: 500, width: "100%" }}>
      <AgGridReact
        ref={innerRef}
        theme={resolvedTheme === "dark" ? darkTheme : lightTheme}
        defaultColDef={{ flex: 1, ...props.defaultColDef }}
        enableFilterHandlers
        columnDefs={columnDefs}
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
        {...props}
      />
    </div>
  );
}

export const DataGrid = forwardRef(DataGridInner) as <T>(
  props: DataGridProps<T> & { ref?: React.ForwardedRef<AgGridReact<T>> },
) => ReturnType<typeof DataGridInner>;
