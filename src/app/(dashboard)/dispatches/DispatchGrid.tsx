"use client";

import { useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import type { Vehicle, Driver, Route, Dispatch } from "@prisma/client";
import { colorSchemeDark, themeQuartz } from "ag-grid-community";
import { useTheme } from "next-themes";
import { dispatchStatusColors } from "@/lib/status-colors";
import * as dispatchActions from "@/app/(dashboard)/dispatches/actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EditDispatchDialog } from "@/app/(dashboard)/dispatches/EditDispatchDialog";

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

const trekkerGridTheme = themeQuartz.withParams({
  accentColor: "#4f46e5",
  backgroundColor: "var(--card)",
  chromeBackgroundColor: "color-mix(in oklch, var(--muted) 50%, transparent)",
  foregroundColor: "var(--foreground)",
  borderColor: "var(--border)",
  headerTextColor: "var(--foreground)",
  rowHoverColor: "color-mix(in oklch, var(--muted) 50%, transparent)",
  borderRadius: 8,
  wrapperBorderRadius: 8,
});

const trekkerGridDarkTheme = themeQuartz.withPart(colorSchemeDark).withParams({
  accentColor: "#818cf8",
  backgroundColor: "var(--card)",
  chromeBackgroundColor: "color-mix(in oklch, var(--muted) 50%, transparent)",
  foregroundColor: "var(--foreground)",
  borderColor: "var(--border)",
  headerTextColor: "var(--foreground)",
  rowHoverColor: "color-mix(in oklch, var(--muted) 50%, transparent)",
  borderRadius: 8,
  wrapperBorderRadius: 8,
});

const DispatchGrid = ({
  dispatches,
  vehicleList,
  driverList,
  routeList,
}: {
  dispatches: DispatchRow[];
  vehicleList: Vehicle[];
  driverList: Driver[];
  routeList: Route[];
}) => {
  const { resolvedTheme } = useTheme();
  const [editingRow, setEditingRow] = useState<DispatchRow | null>(null);
  const [rowToDelete, setRowToDelete] = useState<DispatchRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!rowToDelete) return;
    setIsDeleting(true);
    const result = await dispatchActions.deleteDispatch(rowToDelete.id, {
      error: null,
      success: false,
    });
    setIsDeleting(false);

    if (result.success) {
      toast.success("Sevkiyat silindi");
      setRowToDelete(null);
    }
  };

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
    {
      headerName: "İşlemler",
      width: 110,
      sortable: false,
      filter: false,
      cellRenderer: ({ data }: { data: DispatchRow }) => (
        <div className="mlauto flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setEditingRow(data)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setRowToDelete(data)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div style={{ height: 500, width: "100%" }}>
        <AgGridReact<DispatchRow>
          rowData={dispatches}
          columnDefs={columnDefs}
          theme={resolvedTheme === "dark" ? trekkerGridDarkTheme : trekkerGridTheme}
          defaultColDef={{ flex: 1 }}
        />
      </div>

      {editingRow && (
        <EditDispatchDialog
          key={editingRow.id}
          dispatch={editingRow}
          open={editingRow !== null}
          onOpenChange={(open) => !open && setEditingRow(null)}
          vehicleList={vehicleList}
          driverList={driverList}
          routeList={routeList}
        />
      )}

      <AlertDialog
        open={rowToDelete !== null}
        onOpenChange={(open) => !open && setRowToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sevkiyatı sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu sevkiyat kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive"
            >
              {isDeleting ? "Siliniyor..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DispatchGrid;
