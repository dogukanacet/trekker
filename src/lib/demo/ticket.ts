import { createHmac, timingSafeEqual } from "node:crypto";

const TICKET_TTL_MS = 60_000;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

function sign(payload: string): string {
  // The prefix keeps this signature from being reusable in any other HMAC context.
  return createHmac("sha256", getSecret()).update(`demo-ticket:${payload}`).digest("base64url");
}

// Short-lived proof that the server decided this user may be signed in without a password.
export function createDemoTicket(userId: string): string {
  const payload = `${userId}.${Date.now() + TICKET_TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

// Returns the user id when the ticket is authentic and fresh, otherwise null.
export function verifyDemoTicket(ticket: string): string | null {
  const parts = ticket.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresRaw, signature] = parts as [string, string, string];

  const given = Buffer.from(signature);
  const expected = Buffer.from(sign(`${userId}.${expiresRaw}`));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || Date.now() > expires) return null;
  return userId;
}
