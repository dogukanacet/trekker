import { cookies } from "next/headers";

export const REFRESH_COOKIE_NAME = "trekker.refresh-token";

/**
 * Reads and validates the REFRESH_TOKEN_EXPIRE_MS environment variable.
 * Throws if invalid (undefined, NaN, or negative), preventing silent NaN/Invalid Date
 * values from leaking into the database or cookie.
 */
export function getRefreshTokenExpiryMs(): number {
  const expiresIn = Number(process.env.REFRESH_TOKEN_EXPIRE_MS);

  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error("REFRESH_TOKEN_EXPIRE_MS geçerli bir değer olmalıdır");
  }

  return expiresIn;
}

/**
 * Sets the refresh token cookie. Can only be called from a Server Action / Route Handler
 * (a Next.js restriction — calling it in a Server Component throws an error).
 */
export async function setRefreshCookie(rawToken: string, expiresInMs: number) {
  const cookieStore = await cookies();

  cookieStore.set({
    name: REFRESH_COOKIE_NAME,
    value: rawToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(expiresInMs / 1000),
  });
}
