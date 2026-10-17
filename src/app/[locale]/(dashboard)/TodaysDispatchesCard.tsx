import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { typography } from "@/lib/constants";
import { dispatchStatusColors } from "@/lib/status-colors";
import { DispatchStatusButton } from "@/app/[locale]/(dashboard)/dispatches/DispatchStatusButton";
import type { DispatchStatus } from "@prisma/client";

const MAX_ROWS = 10;

export async function TodaysDispatchesCard({ tenantId }: { tenantId: string | undefined }) {
  // An undefined tenantId would silently drop the tenant filter in Prisma, so bail out early.
  if (!tenantId) return null;

  const t = await getTranslations("Dashboard");
  const dt = await getTranslations("Dispatches");

  const statusLabels: Record<DispatchStatus, string> = {
    PLANNED: dt("planned"),
    IN_PROGRESS: dt("inProgress"),
    COMPLETED: dt("completed"),
    CANCELLED: dt("cancelled"),
  };

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const dispatches = await prisma.dispatch.findMany({
    where: {
      date: { gte: startOfToday, lt: startOfTomorrow },
      vehicle: { depot: { tenantId } },
    },
    include: { vehicle: true, driver: true, route: true },
    orderBy: { date: "asc" },
    take: MAX_ROWS,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className={typography.sectionTitle}>{t("todaysDispatches")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dispatches.length === 0 ? (
          <p className={typography.secondary}>{t("noTodaysDispatches")}</p>
        ) : (
          <ul className="divide-y">
            {dispatches.map((dispatch) => (
              <li key={dispatch.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{dispatch.route.name}</p>
                    <p className={typography.secondary}>
                      {dispatch.vehicle.plate} — {dispatch.driver.fullName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${dispatchStatusColors[dispatch.status]}`}
                  >
                    {statusLabels[dispatch.status]}
                  </span>
                  <DispatchStatusButton dispatchId={dispatch.id} status={dispatch.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="text-right">
          <Link href="/dispatches" className="text-sm text-primary hover:underline">
            {t("viewAllDispatches")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
