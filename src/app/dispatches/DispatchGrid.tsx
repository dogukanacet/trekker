"use client";

import { AgGridReact } from "ag-grid-react";
import type { Dispatch } from "@prisma/client";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

const DispatchGrid = ({ dispatches }: { dispatches: Dispatch[] }) => {
  const columnDefs = [
    { field: "vehicle.plate", headerName: "Araç" },
    { field: "driver.fullName", headerName: "Sürücü" },
    { field: "route.name", headerName: "Rota" },
    { field: "status", headerName: "Durum" },
    { field: "date", headerName: "Tarih" },
  ];
  return (
    <div className="ag-theme-quartz" style={{ height: 500, width: "100%" }}>
      <AgGridReact rowData={dispatches} columnDefs={columnDefs} />
    </div>
  );
};

export default DispatchGrid;
