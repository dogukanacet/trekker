import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth.config";
import { z } from "zod";
import { passesRateLimits, getClientIp } from "@/lib/rate-limit";
import { RateLimitedError } from "@/lib/auth-errors";

// Deliberately loose on the email: only normalize it, so seeded/legacy accounts can still sign in.
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1).max(254),
  password: z.string().min(1).max(256),
});

// Compared against when the email is unknown, so "no such user" costs as much as "wrong password".
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("timing-equalizer", 10));

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Enforced here (not in loginAction) so the /api/auth callback endpoint is covered too.
        const ip = await getClientIp();
        const allowed = await passesRateLimits([
          ["loginAccountIp", `${email}|${ip ?? "unknown"}`],
          ["loginAccount", email],
          ["loginIp", ip],
        ]);
        if (!allowed) throw new RateLimitedError();

        const user = await prisma.user.findUnique({
          where: { email },
          include: { driver: { select: { id: true } } },
        });

        const isValid = await bcrypt.compare(
          password,
          user?.passwordHash ?? (await getDummyHash()),
        );
        if (!user || !isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          driverId: user.driver?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      const nextToken = await authConfig.callbacks.jwt(params);

      if (params.user) {
        return nextToken;
      }

      if (Date.now() < (nextToken.accessTokenExpires as number)) {
        return nextToken;
      }

      // rotating token in here is not safe, only marking as expired
      return { ...nextToken, error: "AccessTokenExpired" };
    },
  },
});
