"use client";

import type { Driver, Depot } from "@prisma/client";
import { useTranslations } from "next-intl";
import { DataGrid, type GridColumn, type DataGridPagination } from "@/components/data-grid";
import { DriverActionsCell } from "@/app/[locale]/(dashboard)/drivers/DriverActionsCell";

const DriverGrid = ({
  driverList,
  depotList,
  pagination,
}: {
  driverList: Driver[];
  depotList: Depot[];
  pagination: DataGridPagination;
}) => {
  const t = useTranslations("Drivers");
  const common = useTranslations("Common");

  const columns: GridColumn<Driver>[] = [
    {
      colId: "fullName",
      header: t("name"),
      value: (row) => row.fullName,
      filter: "text",
      paramKey: "q",
      filterParams: {
        placeholder: common("searchPlaceholder"),
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
      colId: "licenseUntil",
      header: t("licenseUntil"),
      value: (row) => row.licenseUntil,
      filter: "dateRange",
      filterParams: {
        fromLabel: common("startDate"),
        toLabel: common("endDate"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
      render: (row) =>
        row.licenseUntil ? new Date(row.licenseUntil).toLocaleDateString() : common("notAvailable"),
    },
    {
      colId: "actions",
      header: common("actions"),
      width: 110,
      render: (row) => <DriverActionsCell driver={row} depotList={depotList} />,
    },
  ];

  return <DataGrid<Driver> rowData={driverList} columns={columns} pagination={pagination} />;
};

export default DriverGrid;
