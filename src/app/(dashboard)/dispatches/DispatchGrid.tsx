"use client";

import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import type { Dispatch } from "@prisma/client";
import { themeQuartz } from "ag-grid-community";

type DispatchRow = Dispatch & {
  vehicle?: { plate: string } | null;
  driver?: { fullName: string } | null;
  route?: { name: string } | null;
};

const DispatchGrid = ({ dispatches }: { dispatches: DispatchRow[] }) => {
  const columnDefs: ColDef<DispatchRow>[] = [
    {
      headerName: "Araç",
      valueGetter: ({ data }) => data?.vehicle?.plate ?? "-",
    },
    {
      headerName: "Sürücü",
      valueGetter: ({ data }) => data?.driver?.fullName ?? "-",
    },
    {
      headerName: "Rota",
      valueGetter: ({ data }) => data?.route?.name ?? "-",
    },
    {
      field: "status",
      headerName: "Durum",
    },
    {
      field: "date",
      headerName: "Tarih",
      valueFormatter: ({ value }) => (value ? new Date(value).toLocaleDateString("tr-TR") : "-"),
    },
  ];

  return (
    <div style={{ height: 500, width: "100%" }}>
      <AgGridReact<DispatchRow>
        rowData={dispatches}
        columnDefs={columnDefs}
        theme={themeQuartz}
        defaultColDef={{ flex: 1 }}
      />
    </div>
  );
};

export default DispatchGrid;
