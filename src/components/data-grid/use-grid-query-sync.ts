"use client";

import { useCallback } from "react";
import type { RefObject } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import type { AgGridReact } from "ag-grid-react";

export type GridFilterSyncConfig =
  | { colId: string; type: "text"; paramKey: string }
  | { colId: string; type: "multiselect"; paramKey: string }
  | { colId: string; type: "dateRange"; paramKeyFrom: string; paramKeyTo: string };

export function useGridQuerySync(
  gridRef: RefObject<AgGridReact | null>,
  filters: GridFilterSyncConfig[],
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const applyInitialState = useCallback(async () => {
    const api = gridRef.current?.api;
    if (!api) return;

    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");
    if (sortBy) {
      api.applyColumnState({
        state: [{ colId: sortBy, sort: sortOrder === "desc" ? "desc" : "asc" }],
        defaultState: { sort: null },
      });
    }

    for (const config of filters) {
      if (config.type === "text") {
        const value = searchParams.get(config.paramKey);
        if (value) await api.setColumnFilterModel(config.colId, value);
      } else if (config.type === "multiselect") {
        const value = searchParams.get(config.paramKey);
        if (value) await api.setColumnFilterModel(config.colId, value.split(","));
      } else if (config.type === "dateRange") {
        const from = searchParams.get(config.paramKeyFrom);
        const to = searchParams.get(config.paramKeyTo);
        if (from || to)
          await api.setColumnFilterModel(config.colId, { from: from ?? null, to: to ?? null });
      }
    }

    api.onFilterChanged();
  }, [gridRef, searchParams, filters]);

  const handleSortChanged = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;

    const sortedColumn = api.getColumnState().find((col) => col.sort);
    const params = new URLSearchParams(searchParams.toString());

    if (sortedColumn) {
      params.set("sortBy", sortedColumn.colId);
      params.set("sortOrder", sortedColumn.sort as string);
    } else {
      params.delete("sortBy");
      params.delete("sortOrder");
    }
    params.delete("page");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [gridRef, router, pathname, searchParams]);

  const handleFilterChanged = useCallback(async () => {
    const api = gridRef.current?.api;
    if (!api) return;

    const params = new URLSearchParams(searchParams.toString());

    for (const config of filters) {
      if (config.type === "text") {
        const model = await api.getColumnFilterModel(config.colId);
        model ? params.set(config.paramKey, model as string) : params.delete(config.paramKey);
      } else if (config.type === "multiselect") {
        const model = (await api.getColumnFilterModel(config.colId)) as string[] | null;
        model?.length
          ? params.set(config.paramKey, model.join(","))
          : params.delete(config.paramKey);
      } else if (config.type === "dateRange") {
        const model = (await api.getColumnFilterModel(config.colId)) as {
          from: string | null;
          to: string | null;
        } | null;
        model?.from
          ? params.set(config.paramKeyFrom, model.from)
          : params.delete(config.paramKeyFrom);
        model?.to ? params.set(config.paramKeyTo, model.to) : params.delete(config.paramKeyTo);
      }
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [gridRef, router, pathname, searchParams, filters]);

  return { applyInitialState, handleSortChanged, handleFilterChanged };
}
