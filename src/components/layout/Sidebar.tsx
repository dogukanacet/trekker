"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Truck,
  Users,
  Route as RouteIcon,
  ClipboardList,
  Warehouse,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";
import { hasPermission, type Resource } from "@/lib/permissions";

export function Sidebar({ role }: { role?: Role }) {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");

  const navItems: {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    resource: Resource | null;
  }[] = [
    { href: "/", label: t("dashboard"), icon: LayoutDashboard, resource: null },
    { href: "/depots", label: t("depots"), icon: Warehouse, resource: "depots" },
    { href: "/vehicles", label: t("vehicles"), icon: Truck, resource: "vehicles" },
    { href: "/drivers", label: t("drivers"), icon: Users, resource: "drivers" },
    { href: "/routes", label: t("routes"), icon: RouteIcon, resource: "routes" },
    { href: "/dispatches", label: t("dispatches"), icon: ClipboardList, resource: "dispatches" },
    { href: "/users", label: t("users"), icon: UserCog, resource: "users" },
  ];

  const visibleItems = navItems.filter(
    (item) => item.resource === null || hasPermission(role, item.resource, "read"),
  );

  return (
    <aside className="w-56 shrink-0 border-r bg-background flex flex-col">
      <div className="h-14 flex items-center px-4 border-b">
        <span className="font-semibold">Trekker</span>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
