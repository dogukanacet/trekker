"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import type { AgGridReact } from "ag-grid-react";
import type { RefObject } from "react";

type StatusFilterModel = { values?: string[] | null };
type DateFilterModel = { dateFrom?: string | null; dateTo?: string | null };

export function useGridQuerySync(gridRef: RefObject<AgGridReact | null>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const applyFilters = useCallback(() => {
    gridRef.current?.api?.onFilterChanged();
  }, [gridRef]);

  const clearFilters = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;

    api.setFilterModel(null);

    const params = new URLSearchParams();
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");

    if (sortBy) params.set("sortBy", sortBy);
    if (sortOrder) params.set("sortOrder", sortOrder);

    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`, {
      scroll: false,
    });
  }, [gridRef, pathname, router, searchParams]);

  // 1. Sayfa yüklendiğinde: URL'deki mevcut filtre/sort'u grid'e uygula
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

    const statusParam = searchParams.get("status");
    const statusValues = statusParam
      ? statusParam
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
    if (statusValues.length) {
      await api.setColumnFilterModel("status", { values: statusValues });
    }

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    if (dateFrom || dateTo) {
      await api.setColumnFilterModel("date", {
        filterType: "date",
        type: "inRange",
        dateFrom: dateFrom ?? null,
        dateTo: dateTo ?? null,
      });
    }

    api.onFilterChanged();
  }, [gridRef, searchParams]);

  // 2. Kullanıcı grid'de sıralama değiştirdiğinde: URL'e yaz
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

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [gridRef, router, pathname, searchParams]);

  // 3. Kullanıcı grid'de filtre değiştirdiğinde: URL'e yaz
  const handleFilterChanged = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;

    const params = new URLSearchParams(searchParams.toString());

    const statusModel = api.getColumnFilterModel("status") as StatusFilterModel | null | undefined;
    if (statusModel?.values?.length) {
      params.set("status", statusModel.values.join(","));
    } else {
      params.delete("status");
    }

    const dateModel = api.getColumnFilterModel("date") as DateFilterModel | null | undefined;
    if (dateModel?.dateFrom || dateModel?.dateTo) {
      if (dateModel.dateFrom) params.set("dateFrom", dateModel.dateFrom);
      else params.delete("dateFrom");
      if (dateModel.dateTo) params.set("dateTo", dateModel.dateTo);
      else params.delete("dateTo");
    } else {
      params.delete("dateFrom");
      params.delete("dateTo");
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [gridRef, router, pathname, searchParams]);

  return { applyInitialState, handleSortChanged, handleFilterChanged, applyFilters, clearFilters };
}
