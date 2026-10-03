import { randomBytes, createHash } from "crypto";

export const RESET_TOKEN_EXPIRE_MS = 1000 * 60 * 30; // 30 dakika

export function generateResetToken() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
