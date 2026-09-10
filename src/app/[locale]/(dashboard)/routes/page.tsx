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
import { AddRouteDialog } from "@/app/[locale]/(dashboard)/routes/AddRouteDialog";
import RouteRow from "@/app/[locale]/(dashboard)/routes/RouteRow";
import RoutesFilterBar from "@/app/[locale]/(dashboard)/routes/RoutesFilterBar";
import { getTranslations } from "next-intl/server";

const RoutesPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; depotId?: string }>;
}) => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const { q, depotId } = await searchParams;

  const depotList = await prisma.depot.findMany({ where: { tenantId } });
  const routeList = await prisma.route.findMany({
    where: {
      depot: { tenantId, ...(depotId ? { id: depotId } : {}) },
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
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
        <RoutesFilterBar depotList={depotList} />
        <AddRouteDialog depotList={depotList} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("name")}</TableHead>
            <TableHead>{t("depot")}</TableHead>
            <TableHead>{t("createdAt")}</TableHead>
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
