import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { issueRefreshToken } from "@/lib/refresh-token";
import { getRefreshTokenExpiryMs, setRefreshCookie } from "@/lib/refresh-cookie";
import { createDemoTicket } from "./ticket";

/**
 * Signs the visitor in as the given demo user through the server-only "demo" provider.
 * Returns false when sign-in was refused.
 */
export async function startDemoSession(userId: string): Promise<boolean> {
  try {
    await signIn("demo", { ticket: createDemoTicket(userId), redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return false;
    throw error; // keep NEXT_REDIRECT and unexpected errors flowing
  }

  // Same follow-up as loginAction: without a DB-backed refresh token and cookie,
  // SessionRefresher would sign the visitor out when the access token expires.
  const refreshToken = await issueRefreshToken(userId);
  await setRefreshCookie(refreshToken, getRefreshTokenExpiryMs());

  return true;
}
