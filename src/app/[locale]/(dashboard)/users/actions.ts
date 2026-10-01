"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { authorize } from "@/lib/authorize";
import { Role } from "@prisma/client";
import { resend } from "@/lib/resend";
import { generateResetToken, RESET_TOKEN_EXPIRE_MS } from "@/lib/reset-token";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const userCreateSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role),
  driverId: z.string().optional(),
});

const userUpdateSchema = z.object({
  role: z.nativeEnum(Role),
  driverId: z.string().optional(),
});

export const createUser = async (
  prevState: { error: string | null; success: boolean },
  data: FormData,
) => {
  const authz = await authorize("users", "create");
  if (!authz.ok) return { error: authz.error, success: false };
  const { t, tenantId } = authz;

  const email = data.get("email") as string;
  const role = data.get("role") as string;
  const driverId = (data.get("driverId") as string) || undefined;

  const validationResult = userCreateSchema.safeParse({ email, role, driverId });
  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    return { error: t("validationFailed", { message: errorMessages }), success: false };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: validationResult.data.email },
  });
  if (existingUser) {
    return { error: t("emailInUse"), success: false };
  }

  if (validationResult.data.driverId) {
    const driver = await prisma.driver.findFirst({
      where: { id: validationResult.data.driverId, depot: { tenantId }, userId: null },
    });
    if (!driver) {
      return { error: t("driverNotAvailable"), success: false };
    }
  }

  // Kullanıcı ilk girişte kendi şifresini invite linkinden belirleyecek —
  // bu arada asla kullanılmayacak rastgele bir hash yazıyoruz (login denemesi hiçbir
  // düz metinle eşleşmez, placeholder tamamen işlevsiz bir değer).
  const placeholderPasswordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);

  const user = await prisma.user.create({
    data: {
      email: validationResult.data.email,
      passwordHash: placeholderPasswordHash,
      role: validationResult.data.role,
      tenantId,
      ...(validationResult.data.driverId
        ? { driver: { connect: { id: validationResult.data.driverId } } }
        : {}),
    },
  });

  const { token, tokenHash } = generateResetToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRE_MS),
    },
  });

  const inviteUrl = `${process.env.AUTH_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: user.email,
    subject: "Trekker - Hesabınız Oluşturuldu",
    html: `
      <p>Trekker'da senin için bir hesap oluşturuldu. Şifreni belirlemek için aşağıdaki linke tıkla. Bu link 30 dakika geçerlidir.</p>
      <p><a href="${inviteUrl}">${inviteUrl}</a></p>
    `,
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/users`);

  return { error: null, success: true };
};

export const updateUser = async (
  userId: string,
  prevState: { error: string | null; success: boolean },
  data: FormData,
) => {
  const authz = await authorize("users", "update");
  if (!authz.ok) return { error: authz.error, success: false };
  const { t, tenantId } = authz;

  const role = data.get("role") as string;
  const driverId = (data.get("driverId") as string) || undefined;

  const validationResult = userUpdateSchema.safeParse({ role, driverId });
  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    return { error: t("validationFailed", { message: errorMessages }), success: false };
  }

  const targetUser = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!targetUser) {
    return { error: t("userNotFound"), success: false };
  }

  if (validationResult.data.driverId) {
    const driver = await prisma.driver.findFirst({
      where: {
        id: validationResult.data.driverId,
        depot: { tenantId },
        OR: [{ userId: null }, { userId }],
      },
    });
    if (!driver) {
      return { error: t("driverNotAvailable"), success: false };
    }
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { role: validationResult.data.role } }),
    // Önce bu kullanıcıya bağlı olabilecek eski sürücü kaydını serbest bırak...
    prisma.driver.updateMany({ where: { userId, depot: { tenantId } }, data: { userId: null } }),
    // ...sonra (varsa) yeni seçilen sürücüye bağla.
    ...(validationResult.data.driverId
      ? [
          prisma.driver.update({
            where: { id: validationResult.data.driverId },
            data: { userId },
          }),
        ]
      : []),
  ]);

  const locale = await getLocale();
  revalidatePath(`/${locale}/users`);

  return { error: null, success: true };
};

export const deleteUser = async (
  userId: string,
  prevState: { error: string | null; success: boolean },
) => {
  const authz = await authorize("users", "delete");
  if (!authz.ok) return { error: authz.error, success: false };
  const { t, tenantId, userId: currentUserId } = authz;

  if (currentUserId === userId) {
    return { error: t("cannotDeleteSelf"), success: false };
  }

  const result = await prisma.user.deleteMany({ where: { id: userId, tenantId } });
  if (result.count === 0) {
    return { error: t("userNotFound"), success: false };
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/users`);

  return { error: null, success: true };
};
