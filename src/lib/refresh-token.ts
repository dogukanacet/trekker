import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { JWT } from "next-auth/jwt";
import { getRefreshTokenExpiryMs } from "./refresh-cookie";

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const rawToken = generateRefreshToken();

  const expiresAt = new Date(Date.now() + getRefreshTokenExpiryMs());

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
