"use client";

import { useRef, useState } from "react";
import type { Vehicle, Driver, Route, Dispatch } from "@prisma/client";
import { dispatchStatusColors } from "@/lib/status-colors";
import * as dispatchActions from "@/app/[locale]/(dashboard)/dispatches/actions";
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
import { EditDispatchDialog } from "@/app/[locale]/(dashboard)/dispatches/EditDispatchDialog";
import { useTranslations } from "next-intl";
import {
  DataGrid,
  type ColDef,
  type GridFilterSyncConfig,
  type FilterType,
} from "@/components/data-grid";

type DispatchRow = Dispatch & {
  vehicle?: { plate: string } | null;
  driver?: { fullName: string } | null;
  route?: { name: string } | null;
};

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
  const t = useTranslations("Dispatches");
  const common = useTranslations("Common");
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
      toast.success(t("deleted"));
      setRowToDelete(null);
    }
  };

  const filterSyncConfig: GridFilterSyncConfig[] = [
    { colId: "vehiclePlate", type: "text", paramKey: "vehiclePlate" },
    { colId: "driverName", type: "text", paramKey: "driverName" },
    { colId: "routeName", type: "text", paramKey: "routeName" },
    { colId: "status", type: "multiselect", paramKey: "status" },
    { colId: "date", type: "dateRange", paramKeyFrom: "dateFrom", paramKeyTo: "dateTo" },
  ];

  const statusOptions = [
    { value: "PLANNED", label: t("planned") },
    { value: "IN_PROGRESS", label: t("inProgress") },
    { value: "COMPLETED", label: t("completed") },
    { value: "CANCELLED", label: t("cancelled") },
  ];

  const columnDefs: ColDef<DispatchRow>[] = [
    {
      colId: "vehiclePlate",
      headerName: t("vehicle"),
      valueGetter: ({ data }) => data?.vehicle?.plate ?? common("notAvailable"),
      sortable: false,
      filter: "text" satisfies FilterType,
      filterParams: {
        placeholder: t("vehicle"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
    },
    {
      colId: "driverName",
      headerName: t("driver"),
      valueGetter: ({ data }) => data?.driver?.fullName ?? common("notAvailable"),
      sortable: false,
      filter: "text" satisfies FilterType,
      filterParams: {
        placeholder: t("driver"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
    },
    {
      colId: "routeName",
      headerName: t("route"),
      valueGetter: ({ data }) => data?.route?.name ?? common("notAvailable"),
      sortable: false,
      filter: "text" satisfies FilterType,
      filterParams: {
        placeholder: t("route"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
    },
    {
      field: "status",
      headerName: t("status"),
      sortable: true,
      comparator: () => 0,
      filter: "multiselect" satisfies FilterType,
      filterParams: {
        options: statusOptions,
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
      cellRenderer: ({ value }: { value: Dispatch["status"] }) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${dispatchStatusColors[value]}`}
        >
          {statusOptions.find((o) => o.value === value)?.label}
        </span>
      ),
    },
    {
      field: "date",
      headerName: t("date"),
      sortable: true,
      comparator: () => 0,
      filter: "dateRange" satisfies FilterType,
      filterParams: {
        fromLabel: common("startDate"),
        toLabel: common("endDate"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
      valueFormatter: ({ value }) =>
        value ? new Date(value).toLocaleDateString() : common("notAvailable"),
    },
    {
      colId: "actions",
      headerName: common("actions"),
      width: 110,
      sortable: false,
      filter: false,
      cellRenderer: ({ data }: { data: DispatchRow }) => (
        <div className="flex items-center gap-1">
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
      <DataGrid<DispatchRow>
        rowData={dispatches}
        columnDefs={columnDefs}
        filterSyncConfig={filterSyncConfig}
      />

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
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{common("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive"
            >
              {isDeleting ? common("deleting") : common("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DispatchGrid;
