import { auth } from "@/lib/auth";
import { hasPermission, type Resource, type Action } from "@/lib/permissions";
import { getTranslations } from "next-intl/server";

export async function authorize(resource: Resource, action: Action) {
  const t = await getTranslations("Errors");
  const session = await auth();
  const tenantId = session?.user?.tenantId;

  if (!session || !tenantId) {
    return { ok: false as const, error: t("unauthenticated") };
  }

  if (!hasPermission(session.user.role, resource, action)) {
    return { ok: false as const, error: t("forbidden") };
  }

  return {
    ok: true as const,
    t,
    tenantId,
    userId: session.user.id,
    role: session.user.role,
    driverId: session.user.driverId,
  };
}
