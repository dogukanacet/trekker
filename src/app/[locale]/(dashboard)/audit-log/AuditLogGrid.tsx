"use client";

import type { AuditAction } from "@prisma/client";
import { useTranslations } from "next-intl";
import { DataGrid, type GridColumn, type DataGridPagination } from "@/components/data-grid";
import type { AuditRow } from "./query";
import { AuditDetailPanel } from "./AuditDetailPanel";
import { useAuditFormat } from "./useAuditFormat";

const actionColors: Record<AuditAction, string> = {
  CREATE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  STATUS_CHANGE: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  ROLE_CHANGE: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  INVITE: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
};

const AuditLogGrid = ({
  rows,
  pagination,
}: {
  rows: AuditRow[];
  pagination: DataGridPagination;
}) => {
  const t = useTranslations("AuditLog");
  const common = useTranslations("Common");
  const { summarize } = useAuditFormat();

  const actionLabels: Record<string, string> = {
    CREATE: t("actions.CREATE"),
    UPDATE: t("actions.UPDATE"),
    DELETE: t("actions.DELETE"),
    STATUS_CHANGE: t("actions.STATUS_CHANGE"),
    ROLE_CHANGE: t("actions.ROLE_CHANGE"),
    INVITE: t("actions.INVITE"),
  };

  const resourceLabels: Record<string, string> = {
    depots: t("resources.depots"),
    vehicles: t("resources.vehicles"),
    drivers: t("resources.drivers"),
    routes: t("resources.routes"),
    dispatches: t("resources.dispatches"),
    users: t("resources.users"),
  };

  const toOptions = (labels: Record<string, string>) =>
    Object.entries(labels).map(([value, label]) => ({ value, label }));

  const columns: GridColumn<AuditRow>[] = [
    {
      colId: "createdAt",
      header: t("columns.date"),
      value: (row) => row.createdAt,
      exportValue: (row) => new Date(row.createdAt).toLocaleString(),
      filter: "dateRange",
      filterParams: {
        fromLabel: common("startDate"),
        toLabel: common("endDate"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      colId: "actorEmail",
      header: t("columns.actor"),
      value: (row) => row.actorEmail,
      filter: "text",
      filterParams: {
        placeholder: t("columns.actor"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
    },
    {
      colId: "action",
      header: t("columns.action"),
      value: (row) => row.action,
      exportValue: (row) => actionLabels[row.action],
      filter: "multiselect",
      filterParams: {
        options: toOptions(actionLabels),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
      render: (row) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${actionColors[row.action]}`}
        >
          {actionLabels[row.action]}
        </span>
      ),
    },
    {
      colId: "resource",
      header: t("columns.resource"),
      value: (row) => row.resource,
      exportValue: (row) => resourceLabels[row.resource] ?? row.resource,
      filter: "multiselect",
      filterParams: {
        options: toOptions(resourceLabels),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
      render: (row) => resourceLabels[row.resource] ?? row.resource,
    },
    {
      colId: "resourceLabel",
      header: t("columns.record"),
      value: (row) => row.resourceLabel ?? common("notAvailable"),
      filter: "text",
      filterParams: {
        placeholder: t("columns.record"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
    },
    {
      // Not sortable on the server: the changes live in a JSON column.
      colId: "changes",
      header: t("columns.changes"),
      value: (row) => summarize(row.changes),
    },
  ];

  return (
    <DataGrid<AuditRow>
      rowData={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      renderDetail={(row) => <AuditDetailPanel changes={row.changes} />}
      singleExpand
      pagination={pagination}
      exportOptions={{ resource: "auditLog", title: t("title") }}
    />
  );
};

export default AuditLogGrid;
