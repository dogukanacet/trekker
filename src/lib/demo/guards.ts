import type { PrismaClient, Role } from "@prisma/client";

export const DEMO_EMAIL_DOMAIN = "demo.invalid";

// The three seeded accounts every demo tenant gets; the role switcher signs into these.
const CORE_DEMO_EMAIL = /^demo-[a-z0-9]+-(admin|dispatcher|driver)@demo\.invalid$/;

export function coreDemoEmail(tenantId: string, role: Role): string {
  return `demo-${tenantId}-${role.toLowerCase()}@${DEMO_EMAIL_DOMAIN}`;
}

export function isCoreDemoUserEmail(email: string): boolean {
  return CORE_DEMO_EMAIL.test(email);
}

// Invites in a demo are simulated. User.email is globally unique, so the typed address is
// rewritten to an unroutable one: a visitor can't squat a real person's email, and no mail
// can ever be delivered.
export function demoInviteEmail(email: string, tenantId: string): string {
  const local =
    (email.split("@")[0] ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .slice(0, 30) || "invitee";
  return `${local}+${tenantId}@${DEMO_EMAIL_DOMAIN}`;
}

export async function isDemoTenant(db: PrismaClient, tenantId: string): Promise<boolean> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { isDemo: true },
  });
  return tenant?.isDemo ?? false;
}
