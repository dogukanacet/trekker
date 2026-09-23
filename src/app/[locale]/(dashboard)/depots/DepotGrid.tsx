"use client";

import type { Depot } from "@prisma/client";
import { useTranslations } from "next-intl";
import { DataGrid, type GridColumn, type DataGridPagination } from "@/components/data-grid";
import { DepotActionsCell } from "@/app/[locale]/(dashboard)/depots/DepotActionsCell";

type DepotRow = Depot & {
  _count: { vehicles: number; drivers: number; routes: number };
};

const DepotGrid = ({
  depotList,
  pagination,
}: {
  depotList: DepotRow[];
  pagination: DataGridPagination;
}) => {
  const t = useTranslations("Depots");
  const common = useTranslations("Common");

  const columns: GridColumn<DepotRow>[] = [
    {
      colId: "name",
      header: t("name"),
      value: (row) => row.name,
      filter: "text",
      paramKey: "q",
      filterParams: {
        placeholder: common("searchPlaceholder"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
    },
    {
      colId: "vehicleCount",
      header: t("vehicleCount"),
      render: (row) => row._count.vehicles,
    },
    {
      colId: "driverCount",
      header: t("driverCount"),
      render: (row) => row._count.drivers,
    },
    {
      colId: "routeCount",
      header: t("routeCount"),
      render: (row) => row._count.routes,
    },
    {
      colId: "actions",
      header: common("actions"),
      width: 110,
      render: (row) => <DepotActionsCell depot={row} />,
    },
  ];

  return <DataGrid<DepotRow> rowData={depotList} columns={columns} pagination={pagination} />;
};

export default DepotGrid;
