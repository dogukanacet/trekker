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
import { DataGrid, type GridColumn } from "@/components/data-grid";
import { DispatchDetailPanel } from "./DispatchDetailPanel";

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

  const statusOptions = [
    { value: "PLANNED", label: t("planned") },
    { value: "IN_PROGRESS", label: t("inProgress") },
    { value: "COMPLETED", label: t("completed") },
    { value: "CANCELLED", label: t("cancelled") },
  ];

  const columns: GridColumn<DispatchRow>[] = [
    {
      colId: "vehiclePlate",
      header: t("vehicle"),
      value: (row) => row.vehicle?.plate ?? common("notAvailable"),
      filter: "text",
      filterParams: {
        placeholder: t("vehicle"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
    },
    {
      colId: "driverName",
      header: t("driver"),
      value: (row) => row.driver?.fullName ?? common("notAvailable"),
      filter: "text",
      filterParams: {
        placeholder: t("driver"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
    },
    {
      colId: "routeName",
      header: t("route"),
      value: (row) => row.route?.name ?? common("notAvailable"),
      filter: "text",
      filterParams: {
        placeholder: t("route"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
    },
    {
      colId: "status",
      header: t("status"),
      value: (row) => row.status,
      filter: "multiselect",
      filterParams: {
        options: statusOptions,
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
      render: (row) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${dispatchStatusColors[row.status]}`}
        >
          {statusOptions.find((o) => o.value === row.status)?.label}
        </span>
      ),
    },
    {
      colId: "date",
      header: t("date"),
      value: (row) => row.date,
      filter: "dateRange",
      filterParams: {
        fromLabel: common("startDate"),
        toLabel: common("endDate"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
      render: (row) =>
        row.date ? new Date(row.date).toLocaleDateString() : common("notAvailable"),
    },
    {
      colId: "actions",
      header: common("actions"),
      width: 110,
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setEditingRow(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setRowToDelete(row)}>
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
        columns={columns}
        getRowKey={(row) => row.id}
        renderDetail={(row) => <DispatchDetailPanel dispatchId={row.id} />}
        singleExpand
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
