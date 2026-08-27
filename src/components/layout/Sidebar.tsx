"use client";

import { LayoutDashboard, Truck, Users, Route as RouteIcon, ClipboardList } from "lucide-react";
import { NavItem } from "@/components/layout/NavItem";
const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/dispatches",
    label: "Dispatches",
    icon: ClipboardList,
  },
  {
    href: "/vehicles",
    label: "Vehicles",
    icon: Truck,
  },
  {
    href: "/drivers",
    label: "Drivers",
    icon: Users,
  },
  {
    href: "/routes",
    label: "Routes",
    icon: RouteIcon,
  },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r bg-background flex flex-col">
      <div className="h-14 flex items-center px-4 border-b">
        <span className="font-semibold">Trekker</span>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavItem item={item} key={item.href} />
        ))}
      </nav>
    </aside>
  );
}
