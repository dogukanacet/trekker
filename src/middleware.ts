import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLogin = req.nextUrl.pathname === "/login";
  const isOnRegister = req.nextUrl.pathname === "/register";

  if (!isLoggedIn && !isOnLogin && !isOnRegister) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && (isOnLogin || isOnRegister)) {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
