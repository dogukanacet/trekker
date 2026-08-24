import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getRefreshTokenExpiryMs } from "./refresh-cookie";

const refreshMaxAgeSec = Math.floor(getRefreshTokenExpiryMs() / 1000);
const accessTokenTtlMs = Number(process.env.ACCESS_TOKEN_EXPIRE_MS);

export const authConfig = {
  providers: [Credentials],
  session: {
    strategy: "jwt",
    maxAge: Number.isFinite(refreshMaxAgeSec) && refreshMaxAgeSec > 0 ? refreshMaxAgeSec : 60 * 60,
    updateAge: 15 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.accessTokenExpires = Date.now() + accessTokenTtlMs;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.tenantId = token.tenantId as string;
      session.user.role = token.role as string;
      if (token.error) {
        session.error = token.error as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
