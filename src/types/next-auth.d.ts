import type { DefaultSession, DefaultUser } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface User extends DefaultUser {
    role?: Role;
    tenantId?: string;
    driverId?: string | null;
  }

  interface Session extends DefaultSession {
    error?: string;
    user: {
      id: string;
      role: Role;
      tenantId: string;
      driverId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    tenantId?: string;
    driverId?: string | null;
    accessTokenExpires?: number;
    error?: string;
  }
}
