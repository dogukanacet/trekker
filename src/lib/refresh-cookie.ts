import { cookies } from "next/headers";

export const REFRESH_COOKIE_NAME = "trekker.refresh-token";

/**
 * REFRESH_TOKEN_EXPIRE_MS env değişkenini okur ve doğrular.
 * Geçersizse (tanımsız, NaN, negatif) fırlatır — sessiz NaN/Invalid Date
 * durumlarının DB'ye veya cookie'ye sızmasını engeller.
 */
export function getRefreshTokenExpiryMs(): number {
  const expiresIn = Number(process.env.REFRESH_TOKEN_EXPIRE_MS);

  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error("REFRESH_TOKEN_EXPIRE_MS geçerli bir değer olmalıdır");
  }

  return expiresIn;
}

/**
 * Refresh token cookie'sini set eder. Yalnızca Server Action / Route Handler
 * içinde çağrılabilir (Next.js kısıtı — Server Component'te hata fırlatır).
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
