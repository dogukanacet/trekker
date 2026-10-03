"use client";

import type { User, Role } from "@prisma/client";
import { useTranslations } from "next-intl";
import { DataGrid, type GridColumn, type DataGridPagination } from "@/components/data-grid";
import { UserActionsCell } from "@/app/[locale]/(dashboard)/users/UserActionsCell";

type UserRow = User & { driver: { id: string; fullName: string } | null };
type DriverOption = { id: string; fullName: string; userId: string | null };

const UserGrid = ({
  userList,
  driverList,
  currentUserId,
  pagination,
}: {
  userList: UserRow[];
  driverList: DriverOption[];
  currentUserId: string;
  pagination: DataGridPagination;
}) => {
  const t = useTranslations("Users");
  const common = useTranslations("Common");

  const roleLabels: Record<Role, string> = {
    ADMIN: t("admin"),
    DISPATCHER: t("dispatcher"),
    DRIVER: t("driver"),
  };

  const columns: GridColumn<UserRow>[] = [
    {
      colId: "email",
      header: t("email"),
      value: (row) => row.email,
      filter: "text",
      paramKey: "q",
      filterParams: {
        placeholder: common("searchPlaceholder"),
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
    },
    {
      colId: "role",
      header: t("role"),
      value: (row) => row.role,
      filter: "multiselect",
      filterParams: {
        options: [
          { value: "ADMIN", label: t("admin") },
          { value: "DISPATCHER", label: t("dispatcher") },
          { value: "DRIVER", label: t("driver") },
        ],
        applyLabel: common("apply"),
        clearLabel: common("clear"),
      },
      render: (row) => roleLabels[row.role],
    },
    {
      colId: "linkedDriver",
      header: t("linkedDriver"),
      render: (row) => row.driver?.fullName ?? common("notAvailable"),
    },
    {
      colId: "actions",
      header: common("actions"),
      width: 110,
      render: (row) => (
        <UserActionsCell user={row} driverList={driverList} currentUserId={currentUserId} />
      ),
    },
  ];

  return <DataGrid<UserRow> rowData={userList} columns={columns} pagination={pagination} />;
};

export default UserGrid;
