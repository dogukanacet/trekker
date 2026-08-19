"use client";

import { AgGridReact } from "ag-grid-react";
import type { Dispatch } from "@prisma/client";
import { themeQuartz } from "ag-grid-community";

const DispatchGrid = ({ dispatches }: { dispatches: Dispatch[] }) => {
  const columnDefs = [
    { field: "vehicle.plate", headerName: "Araç" },
    { field: "driver.fullName", headerName: "Sürücü" },
    { field: "route.name", headerName: "Rota" },
    { field: "status", headerName: "Durum" },
    { field: "date", headerName: "Tarih" },
  ];
  return (
    <div theme={themeQuartz} defaultColDef={{ flex: 1 }} style={{ height: 500, width: "100%" }}>
      <AgGridReact rowData={dispatches} columnDefs={columnDefs} />
    </div>
  );
};

export default DispatchGrid;
