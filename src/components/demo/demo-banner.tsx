import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DemoRoleSwitcher } from "./demo-role-switcher";

export async function DemoBanner() {
  const session = await auth();
  if (!session?.user?.tenantId) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { isDemo: true, expiresAt: true },
  });
  if (!tenant?.isDemo || !tenant.expiresAt) return null;

  const hours = Math.max(1, Math.ceil((tenant.expiresAt.getTime() - Date.now()) / 3_600_000));
  const t = await getTranslations("Demo");

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 border-b bg-amber-50 px-4 py-2 text-sm text-amber-950"
    >
      <p>{t("banner", { hours })}</p>
      <DemoRoleSwitcher currentRole={session.user.role} />
    </div>
  );
}
