"use server";

import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

const resetSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const resetPassword = async (
  token: string,
  prevState: { error: string | null; success: boolean },
  data: FormData,
) => {
  const t = await getTranslations("Errors");
  const password = data.get("password") as string;

  const validationResult = resetSchema.safeParse({ password });
  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    return { error: t("validationFailed", { message: errorMessages }), success: false };
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!resetToken || resetToken.isCancelled || resetToken.expiresAt < new Date()) {
    return { error: t("invalidOrExpiredToken"), success: false };
  }

  const passwordHash = await bcrypt.hash(validationResult.data.password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { isCancelled: true },
    }),
    // Şifre değiştiğinde mevcut tüm oturumların (refresh token'ların) da
    // geçersiz kılınması güvenlik açısından standart bir pratik.
    prisma.refreshToken.updateMany({
      where: { userId: resetToken.userId, isCancelled: false },
      data: { isCancelled: true },
    }),
  ]);

  return { error: null, success: true };
};
