import { auth } from "@/lib/auth";
import { resolveRoleView } from "@/lib/role-views";
import { AdminDashboard } from "@/app/[locale]/(dashboard)/AdminDashboard";
import { DriverDashboard } from "@/app/[locale]/(dashboard)/DriverDashboard";

const dashboardViews = {
  default: AdminDashboard,
  DRIVER: DriverDashboard,
};

export default async function Home() {
  const session = await auth();
  const View = resolveRoleView(dashboardViews, session?.user?.role);
  return <View session={session} />;
}
