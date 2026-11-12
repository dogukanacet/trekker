"use server";

import { Role } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { coreDemoEmail } from "@/lib/demo/guards";
import { startDemoSession } from "@/lib/demo/start-session";

type State = { error: string | null; success: boolean };

export async function switchDemoRoleAction(role: Role): Promise<State> {
  const t = await getTranslations("Errors");
  const fail: State = { error: t("demoSwitchFailed"), success: false };

  const parsed = z.nativeEnum(Role).safeParse(role);
  if (!parsed.success) return fail;

  const session = await auth();
  if (!session?.user?.id) return fail;

  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      tenantId: true,
      tenant: { select: { isDemo: true, expiresAt: true } },
    },
  });
  if (
    !current ||
    !current.tenant.isDemo ||
    !current.tenant.expiresAt ||
    current.tenant.expiresAt <= new Date()
  ) {
    return fail;
  }
  if (current.role === parsed.data) return { error: null, success: true };

  const target = await prisma.user.findUnique({
    where: { email: coreDemoEmail(current.tenantId, parsed.data) },
    select: { id: true, tenantId: true },
  });
  if (!target || target.tenantId !== current.tenantId) return fail;

  if (!(await startDemoSession(target.id))) return fail;

  // The previous account's refresh tokens must not outlive the switch.
  await prisma.refreshToken.updateMany({
    where: { userId: current.id, isCancelled: false },
    data: { isCancelled: true },
  });

  return { error: null, success: true };
}
