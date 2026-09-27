"use client";

import type { Vehicle, Driver, Depot } from "@prisma/client";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Eye, ShieldAlert, Wrench, Users as UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { typography } from "@/lib/constants";
import { VehicleQuickEditDialog } from "@/app/[locale]/(dashboard)/VehicleQuickEditDialog";
import { DriverQuickEditDialog } from "@/app/[locale]/(dashboard)/DriverQuickEditDialog";

type Props =
  | {
      kind: "vehicle";
      vehicle: Vehicle;
      depotList: Depot[];
      renewalType: "insurance" | "inspection";
      date: Date;
    }
  | { kind: "driver"; driver: Driver; depotList: Depot[]; date: Date };

const renewalIcons = {
  insurance: ShieldAlert,
  inspection: Wrench,
  license: UsersIcon,
};

const renewalLabelKeys = {
  insurance: "insuranceExpiring",
  inspection: "inspectionExpiring",
  license: "licenseExpiring",
} as const;

export function RenewalRow(props: Props) {
  const t = useTranslations("Dashboard");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil(
    (props.date.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
  );

  const label = props.kind === "vehicle" ? props.vehicle.plate : props.driver.fullName;
  const typeKey = props.kind === "vehicle" ? props.renewalType : "license";
  const Icon = renewalIcons[typeKey];

  const detailHref =
    props.kind === "vehicle"
      ? `/vehicles?q=${encodeURIComponent(props.vehicle.plate)}`
      : `/drivers?q=${encodeURIComponent(props.driver.fullName)}`;

  return (
    <li className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className={typography.secondary}>{t(renewalLabelKeys[typeKey])}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span
          className={`text-sm font-medium mr-1 ${
            daysLeft <= 7 ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {t("daysLeft", { days: daysLeft })}
        </span>
        {props.kind === "vehicle" ? (
          <VehicleQuickEditDialog vehicle={props.vehicle} depotList={props.depotList} />
        ) : (
          <DriverQuickEditDialog driver={props.driver} depotList={props.depotList} />
        )}
        <Button variant="ghost" size="icon" render={<Link href={detailHref} />}>
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
