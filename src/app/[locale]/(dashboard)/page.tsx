import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Users, Route as RouteIcon, ClipboardList } from "lucide-react";
import { typography } from "@/lib/constants";
import { RenewalRow } from "@/app/[locale]/(dashboard)/RenewalRow";
import type { Vehicle, Driver } from "@prisma/client";
import { DriverDashboard } from "@/app/[locale]/(dashboard)/DriverDashboard";

const RENEWAL_WINDOW_DAYS = 30;

type RenewalEntry =
  | {
      kind: "vehicle";
      id: string;
      vehicle: Vehicle;
      renewalType: "insurance" | "inspection";
      date: Date;
    }
  | { kind: "driver"; id: string; driver: Driver; date: Date };

export default async function Home() {
  const session = await auth();

  if (session?.user?.role === "DRIVER") {
    return <DriverDashboard driverId={session.user.driverId} />;
  }

  const t = await getTranslations("Dashboard");
  const tenantId = session?.user?.tenantId;

  const vehicleCount = await prisma.vehicle.count({ where: { depot: { tenantId } } });
  const driverCount = await prisma.driver.count({ where: { depot: { tenantId } } });
  const routeCount = await prisma.route.count({ where: { depot: { tenantId } } });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const dispatchCount = await prisma.dispatch.count({
    where: {
      date: { gte: startOfToday, lt: startOfTomorrow },
      vehicle: { depot: { tenantId } },
    },
  });

  const renewalWindowEnd = new Date(startOfToday);
  renewalWindowEnd.setDate(renewalWindowEnd.getDate() + RENEWAL_WINDOW_DAYS);

  const [vehiclesWithExpiry, driversWithExpiry, depotList] = await Promise.all([
    prisma.vehicle.findMany({
      where: {
        depot: { tenantId },
        OR: [
          { insuranceUntil: { gte: startOfToday, lte: renewalWindowEnd } },
          { inspectionUntil: { gte: startOfToday, lte: renewalWindowEnd } },
        ],
      },
    }),
    prisma.driver.findMany({
      where: {
        depot: { tenantId },
        licenseUntil: { gte: startOfToday, lte: renewalWindowEnd },
      },
    }),
    prisma.depot.findMany({ where: { tenantId } }),
  ]);

  const renewals: RenewalEntry[] = [];
  for (const vehicle of vehiclesWithExpiry) {
    if (vehicle.insuranceUntil && vehicle.insuranceUntil <= renewalWindowEnd) {
      renewals.push({
        kind: "vehicle",
        id: `${vehicle.id}-insurance`,
        vehicle,
        renewalType: "insurance",
        date: vehicle.insuranceUntil,
      });
    }
    if (vehicle.inspectionUntil && vehicle.inspectionUntil <= renewalWindowEnd) {
      renewals.push({
        kind: "vehicle",
        id: `${vehicle.id}-inspection`,
        vehicle,
        renewalType: "inspection",
        date: vehicle.inspectionUntil,
      });
    }
  }
  for (const driver of driversWithExpiry) {
    renewals.push({
      kind: "driver",
      id: `${driver.id}-license`,
      driver,
      date: driver.licenseUntil,
    });
  }
  renewals.sort((a, b) => a.date.getTime() - b.date.getTime());

  const cards = [
    { label: t("vehicles"), count: vehicleCount, href: "/vehicles", icon: Truck },
    { label: t("drivers"), count: driverCount, href: "/drivers", icon: Users },
    { label: t("routes"), count: routeCount, href: "/routes", icon: RouteIcon },
    {
      label: t("todaysDispatches"),
      count: dispatchCount,
      href: "/dispatches",
      icon: ClipboardList,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className={typography.pageTitle}>{t("title")}</h1>
        <p className={typography.secondary}>{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="transition hover:shadow-md hover:border-primary/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className={typography.secondary}>{card.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{card.count}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className={typography.sectionTitle}>{t("upcomingRenewals")}</CardTitle>
        </CardHeader>
        <CardContent>
          {renewals.length === 0 ? (
            <p className={typography.secondary}>{t("noUpcomingRenewals")}</p>
          ) : (
            <ul className="divide-y">
              {renewals
                .slice(0, 10)
                .map((item) =>
                  item.kind === "vehicle" ? (
                    <RenewalRow
                      key={item.id}
                      kind="vehicle"
                      vehicle={item.vehicle}
                      depotList={depotList}
                      renewalType={item.renewalType}
                      date={item.date}
                    />
                  ) : (
                    <RenewalRow
                      key={item.id}
                      kind="driver"
                      driver={item.driver}
                      depotList={depotList}
                      date={item.date}
                    />
                  ),
                )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
