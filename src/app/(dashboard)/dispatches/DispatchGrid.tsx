"use client";

import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import type { Dispatch } from "@prisma/client";
import { themeQuartz } from "ag-grid-community";
import { dispatchStatusColors } from "@/lib/status-colors";

type DispatchRow = Dispatch & {
  vehicle?: { plate: string } | null;
  driver?: { fullName: string } | null;
  route?: { name: string } | null;
};

const statusLabels: Record<Dispatch["status"], string> = {
  PLANNED: "Planlandı",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
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
      cellRenderer: ({ value }: { value: Dispatch["status"] }) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${dispatchStatusColors[value]}`}
        >
          {statusLabels[value]}
        </span>
      ),
    },
    {
      field: "date",
      headerName: "Tarih",
      valueFormatter: ({ value }) => (value ? new Date(value).toLocaleDateString("tr-TR") : "-"),
    },
  ];

  const trekkerGridTheme = themeQuartz.withParams({
    accentColor: "#4f46e5",
    borderRadius: 8,
    wrapperBorderRadius: 8,
  });

  return (
    <div style={{ height: 500, width: "100%" }}>
      <AgGridReact<DispatchRow>
        rowData={dispatches}
        columnDefs={columnDefs}
        theme={trekkerGridTheme}
        defaultColDef={{ flex: 1 }}
      />
    </div>
  );
};

export default DispatchGrid;
