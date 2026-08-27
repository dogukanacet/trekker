import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type NavItemData = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function NavItem({ item }: { item: NavItemData }) {
  const pathname = usePathname();

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
}
