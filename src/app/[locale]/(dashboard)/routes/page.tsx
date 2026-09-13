import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { typography } from "@/lib/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ColumnHeader } from "@/components/ui/data-table/column-header";
import { buildPrismaWhereParams, type FilterFieldConfig } from "@/lib/build-prisma-where";
import { buildOrderBy } from "@/lib/build-order-by";
import { AddRouteDialog } from "@/app/[locale]/(dashboard)/routes/AddRouteDialog";
import RouteRow from "@/app/[locale]/(dashboard)/routes/RouteRow";
import { getTranslations } from "next-intl/server";

const RoutesPage = async ({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    depotId?: string;
    sortBy?: string;
    sortOrder?: string;
    createdAtFrom?: string;
    createdAtTo?: string;
  }>;
}) => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const params = await searchParams;
  const { depotId, sortBy, sortOrder } = params;
  const routeSortKeys = ["name", "depotId", "createdAt"] as const;
  const routeFilters: FilterFieldConfig[] = [
    { key: "q", field: "name", type: "text" },
    { key: "depotId", field: "depotId", type: "exact" },
    { key: "createdAt", field: "createdAt", type: "dateRange" },
  ];

  const depotList = await prisma.depot.findMany({ where: { tenantId } });
  const routeList = await prisma.route.findMany({
    where: {
      depot: { tenantId, ...(depotId ? { id: depotId } : {}) },
      ...buildPrismaWhereParams(params, routeFilters),
    },
    orderBy: buildOrderBy(routeSortKeys, sortBy, sortOrder),
  });
  const t = await getTranslations("Routes");
  const common = await getTranslations("Common");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>{t("title")}</h1>
          <p className={typography.secondary}>{t("subtitle")}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div />
        <AddRouteDialog depotList={depotList} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <ColumnHeader
                label={t("name")}
                sortKey="name"
                filter={{ type: "text", key: "q", placeholder: common("searchByNamePlaceholder") }}
              />
            </TableHead>
            <TableHead>
              <ColumnHeader
                label={t("depot")}
                sortKey="depotId"
                filter={{
                  type: "select",
                  key: "depotId",
                  placeholder: common("allDepots"),
                  options: depotList.map((d) => ({ value: d.id, label: d.name })),
                }}
              />
            </TableHead>
            <TableHead>
              <ColumnHeader
                label={t("createdAt")}
                sortKey="createdAt"
                filter={{
                  type: "date-range",
                  key: "createdAt",
                  fromLabel: common("startDate"),
                  toLabel: common("endDate"),
                }}
              />
            </TableHead>
            <TableHead className="text-right">{common("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {routeList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className={`text-center py-8 ${typography.secondary}`}>
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            routeList.map((route) => (
              <RouteRow key={route.id} route={route} depotList={depotList} />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default RoutesPage;
