import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { typography } from "@/lib/constants";
import { dispatchStatusColors } from "@/lib/status-colors";
import { ClipboardList, ShieldAlert } from "lucide-react";
import type { DispatchStatus } from "@prisma/client";

const RENEWAL_WINDOW_DAYS = 30;

export async function DriverDashboard({ driverId }: { driverId: string | null }) {
  const t = await getTranslations("Dashboard");
  const dt = await getTranslations("Dispatches");

  if (!driverId) {
    return (
      <div className="space-y-6">
        <h1 className={typography.pageTitle}>{t("title")}</h1>
        <Card>
          <CardContent className="pt-6">
            <p className={typography.secondary}>{t("noDriverLinked")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  const [driver, todaysDispatches, upcomingDispatches] = await Promise.all([
    prisma.driver.findUnique({ where: { id: driverId } }),
    prisma.dispatch.findMany({
      where: { driverId, date: { gte: startOfToday, lt: startOfTomorrow } },
      include: { vehicle: true, route: true },
      orderBy: { date: "asc" },
    }),
    prisma.dispatch.findMany({
      where: { driverId, date: { gte: startOfTomorrow } },
      include: { vehicle: true, route: true },
      orderBy: { date: "asc" },
      take: 5,
    }),
  ]);

  const renewalWindowEnd = new Date(startOfToday);
  renewalWindowEnd.setDate(renewalWindowEnd.getDate() + RENEWAL_WINDOW_DAYS);
  const licenseNeedsRenewal =
    driver?.licenseUntil &&
    driver.licenseUntil >= startOfToday &&
    driver.licenseUntil <= renewalWindowEnd;
  const licenseDaysLeft = driver?.licenseUntil
    ? Math.ceil((driver.licenseUntil.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={typography.pageTitle}>
          {t("welcomeDriver", { name: driver?.fullName ?? "" })}
        </h1>
        <p className={typography.secondary}>{t("subtitle")}</p>
      </div>

      {licenseNeedsRenewal && licenseDaysLeft !== null && (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <p className="text-sm">{t("licenseExpiresIn", { days: licenseDaysLeft })}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className={typography.sectionTitle}>{t("todaysDispatchesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {todaysDispatches.length === 0 ? (
            <p className={typography.secondary}>{t("noDispatchesToday")}</p>
          ) : (
            <ul className="divide-y">
              {todaysDispatches.map((dispatch) => (
                <li key={dispatch.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{dispatch.route?.name}</p>
                      <p className={typography.secondary}>{dispatch.vehicle?.plate}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${dispatchStatusColors[dispatch.status]}`}
                  >
                    {statusLabels[dispatch.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className={typography.sectionTitle}>{t("upcomingDispatchesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingDispatches.length === 0 ? (
            <p className={typography.secondary}>{t("noUpcomingDispatches")}</p>
          ) : (
            <ul className="divide-y">
              {upcomingDispatches.map((dispatch) => (
                <li key={dispatch.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{dispatch.route?.name}</p>
                      <p className={typography.secondary}>
                        {dispatch.vehicle?.plate} — {new Date(dispatch.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${dispatchStatusColors[dispatch.status]}`}
                  >
                    {statusLabels[dispatch.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="text-right">
        <Link href="/dispatches" className="text-sm text-primary hover:underline">
          {t("viewAllDispatches")}
        </Link>
      </div>
    </div>
  );
}
