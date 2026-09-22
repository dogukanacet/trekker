"use client";

import type { Route, Depot } from "@prisma/client";
import { useTranslations } from "next-intl";
import { DataGrid, type GridColumn, type DataGridPagination } from "@/components/data-grid";
import { RouteActionsCell } from "@/app/[locale]/(dashboard)/routes/RouteActionsCell";

const RouteGrid = ({
  routeList,
  depotList,
  pagination,
}: {
  routeList: Route[];
  depotList: Depot[];
  pagination: DataGridPagination;
}) => {
  const t = useTranslations("Routes");
  const common = useTranslations("Common");

  const columns: GridColumn<Route>[] = [
    {
      colId: "name",
      header: t("name"),
      value: (row) => row.name,
      filter: "text",
      paramKey: "q",
      filterParams: {
        placeholder: common("searchByNamePlaceholder"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
    },
    {
      colId: "depotId",
      header: t("depot"),
      value: (row) => depotList.find((d) => d.id === row.depotId)?.name ?? common("notAvailable"),
      filter: "multiselect",
      filterParams: {
        options: depotList.map((d) => ({ value: d.id, label: d.name })),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
    },
    {
      colId: "createdAt",
      header: t("createdAt"),
      value: (row) => row.createdAt,
      filter: "dateRange",
      filterParams: {
        fromLabel: common("startDate"),
        toLabel: common("endDate"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
      render: (row) => row.createdAt.toLocaleDateString(),
    },
    {
      colId: "actions",
      header: common("actions"),
      width: 140,
      render: (row) => <RouteActionsCell route={row} depotList={depotList} />,
    },
  ];

  return <DataGrid<Route> rowData={routeList} columns={columns} pagination={pagination} />;
};

export default RouteGrid;
