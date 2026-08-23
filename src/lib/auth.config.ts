import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

const refreshMaxAgeSec = Math.floor(Number(process.env.REFRESH_TOKEN_EXPIRE_MS) / 1000);
const accessTokenTtlMs = 60 * 60 * 1000;

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
      return session;
    },
  },
} satisfies NextAuthConfig;
