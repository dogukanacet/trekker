"use server";

import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { generateResetToken, RESET_TOKEN_EXPIRE_MS } from "@/lib/reset-token";

const emailSchema = z.object({ email: z.string().email() });

export const requestPasswordReset = async (
  prevState: { error: string | null; success: boolean; email: string },
  data: FormData,
) => {
  const t = await getTranslations("Errors");
  const email = data.get("email") as string;

  const validationResult = emailSchema.safeParse({ email });
  if (!validationResult.success) {
    return {
      error: t("validationFailed", { message: "Invalid email" }),
      success: false,
      email: "",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: validationResult.data.email },
  });

  // Kullanıcı bulunamasa da başarı dönüyoruz — email enumeration'ı önlemek için.
  if (user) {
    const { token, tokenHash } = generateResetToken();

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRE_MS),
      },
    });

    const resetUrl = `${process.env.AUTH_URL}/reset-password?token=${token}`;

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: user.email,
      subject: "Trekker - Şifre Sıfırlama",
      html: `
        <p>Şifreni sıfırlamak için aşağıdaki linke tıkla. Bu link 30 dakika geçerlidir.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Bu isteği sen yapmadıysan bu maili görmezden gelebilirsin.</p>
      `,
    });
  }

  return { error: null, success: true, email: validationResult.data.email };
};
