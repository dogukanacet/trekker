"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { passesRateLimits, getClientIp } from "@/lib/rate-limit";
import * as Sentry from "@sentry/nextjs";

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8, "password is required").max(72), // bcrypt ignores everything past 72 bytes
  companyName: z.string().trim().min(1, "company name is required").max(100),
});

export async function registerAction(prevState: { error: string | null }, formData: FormData) {
  const locale = await getLocale();
  const t = await getTranslations("Errors");

  if (!(await passesRateLimits([["registerIp", await getClientIp()]]))) {
    return { error: t("tooManyAttempts") };
  }
  const companyName = formData.get("companyName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const validationResult = registerSchema.safeParse({ email, password, companyName });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.issues.map((err) => err.message).join(", ");
    return { error: `${t("invalidForm")} ${errorMessages}` };
  }

  const validData = validationResult.data;

  try {
    const isEmailExist = await prisma.user.findUnique({ where: { email: validData.email } });
    if (isEmailExist) return { error: t("emailInUse") };

    const passwordHash = await bcrypt.hash(validData.password, 10);

    await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: validData.companyName } });
      await tx.depot.create({ data: { name: "Ana Depo", tenantId: tenant.id } });
      await tx.user.create({
        data: {
          email: validData.email,
          passwordHash,
          tenantId: tenant.id,
          role: "ADMIN",
        },
      });
    });
  } catch (error) {
    Sentry.captureException(error);
    return { error: t("somethingWentWrong") };
  }

  redirect({ href: "/login", locale });
  return { error: null };
}
