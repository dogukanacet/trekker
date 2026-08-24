import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { JWT } from "next-auth/jwt";

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const rawToken = generateRefreshToken();
  const expiresIn = Number(process.env.REFRESH_TOKEN_EXPIRE_MS);

  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error("REFRESH_TOKEN_EXPIRE_MS geçerli bir değer olmalıdır");
  }

  const expiresAt = new Date(Date.now() + expiresIn);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt,
    },
  });

  return rawToken;
}

export async function cancelRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(token) },
    data: { isCancelled: true },
  });
}
