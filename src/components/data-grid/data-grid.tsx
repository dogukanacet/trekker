"use client";

import { forwardRef } from "react";
import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  colorSchemeDark,
  themeQuartz,
} from "ag-grid-community";
import { useTheme } from "next-themes";

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

export const DataGrid = forwardRef<AgGridReact, AgGridReactProps<unknown>>((props, ref) => {
  const { resolvedTheme } = useTheme();

  return (
    <div style={{ height: 500, width: "100%" }}>
      <AgGridReact
        ref={ref}
        theme={resolvedTheme === "dark" ? darkTheme : lightTheme}
        defaultColDef={{ flex: 1, floatingFilter: false, filter: false, ...props.defaultColDef }}
        {...props}
      />
    </div>
  );
});
DataGrid.displayName = "DataGrid";
