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
import { diffRecords } from "@/lib/audit/diff";
import { writeAudit } from "@/lib/audit/write";

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
  const { t, tenantId, userId: actorId, email: actorEmail } = authz;

  const email = data.get("email") as string;
  const role = data.get("role") as string;
  const driverId = (data.get("driverId") as string) || undefined;

  const validationResult = userCreateSchema.safeParse({ email, role, driverId });
  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    return { error: t("validationFailed", { message: errorMessages }), success: false };
  }

  if (validationResult.data.role === "DRIVER" && !validationResult.data.driverId) {
    return { error: t("driverRequiredForRole"), success: false };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: validationResult.data.email },
  });
  if (existingUser) {
    return { error: t("emailInUse"), success: false };
  }

  let driverName: string | null = null;
  if (validationResult.data.driverId) {
    const driver = await prisma.driver.findFirst({
      where: { id: validationResult.data.driverId, depot: { tenantId }, userId: null },
    });
    if (!driver) {
      return { error: t("driverNotAvailable"), success: false };
    }
    driverName = driver.fullName;
  }

  // The user will set their own password from the invite link on first login —
  // until then, write a random hash that will never be used (no login attempt
  // can match it as plaintext; the placeholder is completely unusable).
  const placeholderPasswordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
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

    await writeAudit(tx, {
      tenantId,
      actor: { id: actorId, email: actorEmail },
      action: "INVITE",
      resource: "users",
      resourceId: created.id,
      resourceLabel: created.email,
      // Explicit fields only: the password hash never goes anywhere near the log.
      changes: diffRecords({}, { email: created.email, role: created.role, driver: driverName }),
    });

    return created;
  });

  const { token, tokenHash } = generateResetToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRE_MS),
    },
  });

  const inviteUrl = `${process.env.AUTH_URL}/reset-password?token=${token}&type=invite`;

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
  const { t, tenantId, userId: actorId, email: actorEmail } = authz;

  const role = data.get("role") as string;
  const driverId = (data.get("driverId") as string) || undefined;

  const validationResult = userUpdateSchema.safeParse({ role, driverId });
  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    return { error: t("validationFailed", { message: errorMessages }), success: false };
  }

  if (validationResult.data.role === "DRIVER" && !validationResult.data.driverId) {
    return { error: t("driverRequiredForRole"), success: false };
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    include: { driver: { select: { fullName: true } } },
  });
  if (!targetUser) {
    return { error: t("userNotFound"), success: false };
  }

  let newDriverName: string | null = null;
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
    newDriverName = driver.fullName;
  }

  const roleChanged = targetUser.role !== validationResult.data.role;

  const changes = diffRecords(
    { role: targetUser.role, driver: targetUser.driver?.fullName ?? null },
    { role: validationResult.data.role, driver: newDriverName },
  );

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role: validationResult.data.role } });
    await tx.driver.updateMany({ where: { userId, depot: { tenantId } }, data: { userId: null } });

    if (validationResult.data.driverId) {
      await tx.driver.update({ where: { id: validationResult.data.driverId }, data: { userId } });
    }

    if (roleChanged) {
      await tx.refreshToken.updateMany({
        where: { userId, isCancelled: false },
        data: { isCancelled: true },
      });
    }

    await writeAudit(tx, {
      tenantId,
      actor: { id: actorId, email: actorEmail },
      action: roleChanged ? "ROLE_CHANGE" : "UPDATE",
      resource: "users",
      resourceId: userId,
      resourceLabel: targetUser.email,
      changes,
    });
  });

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
  const { t, tenantId, userId: actorId, email: actorEmail } = authz;

  if (actorId === userId) {
    return { error: t("cannotDeleteSelf"), success: false };
  }

  const target = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!target) {
    return { error: t("userNotFound"), success: false };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.delete({ where: { id: userId } });

    await writeAudit(tx, {
      tenantId,
      actor: { id: actorId, email: actorEmail },
      action: "DELETE",
      resource: "users",
      resourceId: userId,
      resourceLabel: target.email,
      changes: diffRecords({ email: target.email, role: target.role }, {}),
    });
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/users`);

  return { error: null, success: true };
};
