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
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");

  const navItems = [
    { href: "/", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/depots", label: t("depots"), icon: Warehouse },
    { href: "/vehicles", label: t("vehicles"), icon: Truck },
    { href: "/drivers", label: t("drivers"), icon: Users },
    { href: "/routes", label: t("routes"), icon: RouteIcon },
    { href: "/dispatches", label: t("dispatches"), icon: ClipboardList },
  ];

  return (
    <aside className="w-56 shrink-0 border-r bg-background flex flex-col">
      <div className="h-14 flex items-center px-4 border-b">
        <span className="font-semibold">Trekker</span>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
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
