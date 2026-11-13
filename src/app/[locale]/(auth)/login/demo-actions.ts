"use server";

import { after } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, passesRateLimits } from "@/lib/rate-limit";
import { createDemoTenant, MAX_ACTIVE_DEMOS } from "@/lib/demo/create-demo";
import { cleanupExpiredDemoTenants, countActiveDemoTenants } from "@/lib/demo/cleanup";
import { startDemoSession } from "@/lib/demo/start-session";

type State = { error: string | null; success: boolean };

export async function createDemoAction(_prevState: State, _formData: FormData): Promise<State> {
  const t = await getTranslations("Errors");

  const ip = await getClientIp();
  if (!(await passesRateLimits([["demoIp", ip]]))) {
    return { error: t("demoRateLimited"), success: false };
  }

  // Expired demos are removed after the response is sent, so cleanup never slows the visitor down.
  after(async () => {
    try {
      await cleanupExpiredDemoTenants(prisma);
    } catch (error) {
      Sentry.captureException(error);
    }
  });

  // Soft cap: two simultaneous requests can overshoot it by a tenant or two, which is fine here.
  if ((await countActiveDemoTenants(prisma)) >= MAX_ACTIVE_DEMOS) {
    return { error: t("demoCapacityReached"), success: false };
  }

  let adminId: string;
  try {
    adminId = (await createDemoTenant(prisma)).userIds.ADMIN;
  } catch (error) {
    Sentry.captureException(error);
    return { error: t("demoStartFailed"), success: false };
  }

  if (!(await startDemoSession(adminId))) {
    return { error: t("demoStartFailed"), success: false };
  }
  return { error: null, success: true };
}
