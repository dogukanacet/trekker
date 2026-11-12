import type { PrismaClient } from "@prisma/client";

/**
 * Deletes demo tenants and everything they own, in dependency order (most FKs are RESTRICT).
 * Tenant ids are re-checked against isDemo, so a wrong id can never delete a real tenant.
 * Returns how many tenants were deleted.
 */
export async function deleteDemoTenants(db: PrismaClient, tenantIds: string[]): Promise<number> {
  if (tenantIds.length === 0) return 0;

  const demoTenants = await db.tenant.findMany({
    where: { id: { in: tenantIds }, isDemo: true },
    select: { id: true },
  });
  const ids = demoTenants.map((tenant) => tenant.id);
  if (ids.length === 0) return 0;

  const inDemo = { in: ids };

  const results = await db.$transaction([
    db.auditLog.deleteMany({ where: { tenantId: inDemo } }),
    // Dispatch has no tenantId: reach it through its vehicle, driver or route (cascades to status history).
    db.dispatch.deleteMany({
      where: {
        OR: [
          { vehicle: { tenantId: inDemo } },
          { driver: { depot: { tenantId: inDemo } } },
          { route: { depot: { tenantId: inDemo } } },
        ],
      },
    }),
    db.route.deleteMany({ where: { depot: { tenantId: inDemo } } }), // cascades to stops
    db.vehicle.deleteMany({ where: { tenantId: inDemo } }),
    db.driver.deleteMany({ where: { depot: { tenantId: inDemo } } }),
    db.depot.deleteMany({ where: { tenantId: inDemo } }),
    db.user.deleteMany({ where: { tenantId: inDemo } }), // cascades to refresh/reset tokens
    db.tenant.deleteMany({ where: { id: inDemo, isDemo: true } }),
  ]);

  return results[results.length - 1]!.count;
}

// Removes demo tenants whose 24h window is over. Bounded so one request never does unbounded work.
export async function cleanupExpiredDemoTenants(
  db: PrismaClient,
  { now = new Date(), limit = 25 }: { now?: Date; limit?: number } = {},
): Promise<number> {
  const expired = await db.tenant.findMany({
    where: { isDemo: true, expiresAt: { lt: now } },
    select: { id: true },
    orderBy: { expiresAt: "asc" },
    take: limit,
  });
  return deleteDemoTenants(
    db,
    expired.map((tenant) => tenant.id),
  );
}

// Used for the "at most ~50 concurrent demos" cap.
export function countActiveDemoTenants(db: PrismaClient, now = new Date()): Promise<number> {
  return db.tenant.count({ where: { isDemo: true, expiresAt: { gt: now } } });
}
