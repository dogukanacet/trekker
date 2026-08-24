import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    role?: string;
    tenantId?: string;
    id?: string;
  }

  interface Session extends DefaultSession {
    error?: string;
  }
}
