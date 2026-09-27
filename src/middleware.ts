import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { authConfig } from "@/lib/auth.config";
import { routing } from "@/i18n/routing";

const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

function stripLocale(pathname: string): string {
  const segments = pathname.split("/");
  const maybeLocale = segments[1] ?? "";
  if ((routing.locales as readonly string[]).includes(maybeLocale)) {
    return "/" + segments.slice(2).join("/") || "/";
  }
  return pathname;
}

function getLocaleFromPath(pathname: string): string {
  const maybeLocale = pathname.split("/")[1] ?? "";
  return (routing.locales as readonly string[]).includes(maybeLocale)
    ? maybeLocale
    : routing.defaultLocale;
}

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathWithoutLocale = stripLocale(req.nextUrl.pathname);

  const isOnLogin = pathWithoutLocale === "/login";
  const isOnRegister = pathWithoutLocale === "/register";
  const isOnForgotPassword = pathWithoutLocale === "/forgot-password";
  const isOnResetPassword = pathWithoutLocale === "/reset-password";

  const isPublicRoute = isOnLogin || isOnRegister || isOnForgotPassword || isOnResetPassword;
  const locale = getLocaleFromPath(req.nextUrl.pathname);

  if (!isPublicRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }

  if (isLoggedIn && (isOnLogin || isOnRegister)) {
    return NextResponse.redirect(new URL(`/${locale}`, req.url));
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|monitoring).*)"],
};
