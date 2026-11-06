"use server";

import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueRefreshToken } from "@/lib/refresh-token";
import { AuthError } from "next-auth";
import { getRefreshTokenExpiryMs, setRefreshCookie } from "@/lib/refresh-cookie";
import { getTranslations } from "next-intl/server";

export async function loginAction(
  prevState: { error: string | null; success: boolean },
  formData: FormData,
) {
  const t = await getTranslations("Errors");
  const email = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      const rateLimited = (error as { code?: string }).code === "rate_limited";
      return { error: t(rateLimited ? "tooManyAttempts" : "invalidCredentials"), success: false };
    }
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return { error: t("sessionInfoNotFound"), success: false };
  }

  const refreshToken = await issueRefreshToken(user.id);
  const expiresIn = getRefreshTokenExpiryMs();
  await setRefreshCookie(refreshToken, expiresIn);

  return { error: null, success: true };
}
