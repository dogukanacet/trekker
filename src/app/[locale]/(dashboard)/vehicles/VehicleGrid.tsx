"use client";

import type { Vehicle, Depot } from "@prisma/client";
import { useTranslations } from "next-intl";
import { DataGrid, type GridColumn, type DataGridPagination } from "@/components/data-grid";
import { VehicleActionsCell } from "@/app/[locale]/(dashboard)/vehicles/VehicleActionsCell";

const VehicleGrid = ({
  vehicleList,
  depotList,
  pagination,
}: {
  vehicleList: Vehicle[];
  depotList: Depot[];
  pagination: DataGridPagination;
}) => {
  const t = useTranslations("Vehicles");
  const common = useTranslations("Common");

  const columns: GridColumn<Vehicle>[] = [
    {
      colId: "plate",
      header: t("plate"),
      value: (row) => row.plate,
      filter: "text",
      paramKey: "q",
      filterParams: {
        placeholder: common("searchByPlatePlaceholder"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
    },
    {
      colId: "model",
      header: t("model"),
      value: (row) => row.model,
      filter: "text",
      filterParams: {
        placeholder: common("searchPlaceholder"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
      render: (row) => row.model ?? common("notAvailable"),
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
      colId: "insuranceUntil",
      header: t("insuranceUntil"),
      value: (row) => row.insuranceUntil,
      filter: "dateRange",
      filterParams: {
        fromLabel: common("startDate"),
        toLabel: common("endDate"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
      render: (row) =>
        row.insuranceUntil
          ? new Date(row.insuranceUntil).toLocaleDateString()
          : common("notAvailable"),
    },
    {
      colId: "inspectionUntil",
      header: t("inspectionUntil"),
      value: (row) => row.inspectionUntil,
      filter: "dateRange",
      filterParams: {
        fromLabel: common("startDate"),
        toLabel: common("endDate"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
      render: (row) =>
        row.inspectionUntil
          ? new Date(row.inspectionUntil).toLocaleDateString()
          : common("notAvailable"),
    },
    {
      colId: "actions",
      header: common("actions"),
      width: 110,
      render: (row) => <VehicleActionsCell vehicle={row} depotList={depotList} />,
    },
  ];

  return <DataGrid<Vehicle> rowData={vehicleList} columns={columns} pagination={pagination} />;
};

export default VehicleGrid;
