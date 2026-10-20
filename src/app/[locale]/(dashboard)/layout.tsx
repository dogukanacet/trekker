import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { auth } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/translations/guard";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Fresh DB check, used only to show the menu item.
  // The page and the server actions re-check on their own.
  const isPlatformAdmin = (await requirePlatformAdmin()) !== null;

  return (
    <div className="flex h-screen">
      <Sidebar role={session?.user.role} isPlatformAdmin={isPlatformAdmin} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
