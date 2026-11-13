import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { DEMO_COUNTS, seedTenantData } from "@/lib/demo/seed-tenant-data";
import { cleanupExpiredDemoTenants, deleteDemoTenants } from "@/lib/demo/cleanup";

const HOUR_MS = 60 * 60 * 1000;
const createdDemoIds: string[] = [];
const createdRealIds: string[] = [];

async function createDemoTenant(expiresInMs: number) {
  const tenant = await prisma.tenant.create({
    data: { name: "Demo test", isDemo: true, expiresAt: new Date(Date.now() + expiresInMs) },
  });
  createdDemoIds.push(tenant.id);
  const summary = await prisma.$transaction((tx) => seedTenantData(tx, tenant.id, DEMO_COUNTS), {
    timeout: 30_000,
  });
  // Rows that also have to disappear with the tenant.
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: `demo-test-${tenant.id}@demo.invalid`,
      passwordHash: "not-a-real-hash",
      role: "ADMIN",
    },
  });
  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorId: user.id,
      actorEmail: user.email,
      action: "CREATE",
      resource: "vehicles",
      resourceId: "test",
    },
  });
  return { tenant, summary };
}

async function rowCounts(tenantId: string) {
  const [depots, vehicles, users, audit, dispatches, tenants] = await Promise.all([
    prisma.depot.count({ where: { tenantId } }),
    prisma.vehicle.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId } }),
    prisma.auditLog.count({ where: { tenantId } }),
    prisma.dispatch.count({ where: { vehicle: { tenantId } } }),
    prisma.tenant.count({ where: { id: tenantId } }),
  ]);
  return { depots, vehicles, users, audit, dispatches, tenants };
}

afterAll(async () => {
  await deleteDemoTenants(prisma, createdDemoIds);
  for (const id of createdRealIds) {
    await prisma.depot.deleteMany({ where: { tenantId: id } });
    await prisma.tenant.deleteMany({ where: { id } });
  }
  await prisma.$disconnect();
});

describe("demo tenant seeding and cleanup", () => {
  it("seeds the expected volume with unique plates scoped to the tenant", async () => {
    const { tenant, summary } = await createDemoTenant(HOUR_MS);

    expect(summary.depots).toBe(DEMO_COUNTS.depots);
    expect(summary.vehicles).toBe(DEMO_COUNTS.vehicles);
    expect(summary.dispatches).toBe(DEMO_COUNTS.dispatches);
    expect(summary.drivers).toHaveLength(DEMO_COUNTS.drivers);

    const plates = (
      await prisma.vehicle.findMany({ where: { tenantId: tenant.id }, select: { plate: true } })
    ).map((vehicle) => vehicle.plate);
    expect(new Set(plates).size).toBe(plates.length);
  });

  it("deleting demo A leaves demo B and a real tenant untouched", async () => {
    const a = await createDemoTenant(HOUR_MS);
    const b = await createDemoTenant(HOUR_MS);
    const real = await prisma.tenant.create({ data: { name: "Real test tenant" } });
    createdRealIds.push(real.id);
    await prisma.depot.create({ data: { tenantId: real.id, name: "Real depot" } });

    const bBefore = await rowCounts(b.tenant.id);
    expect(await deleteDemoTenants(prisma, [a.tenant.id])).toBe(1);

    expect(await rowCounts(a.tenant.id)).toEqual({
      depots: 0,
      vehicles: 0,
      users: 0,
      audit: 0,
      dispatches: 0,
      tenants: 0,
    });
    expect(await rowCounts(b.tenant.id)).toEqual(bBefore);
    expect((await rowCounts(real.id)).depots).toBe(1);
  });

  it("refuses to delete a tenant that is not a demo", async () => {
    const real = await prisma.tenant.create({ data: { name: "Real test tenant 2" } });
    createdRealIds.push(real.id);

    expect(await deleteDemoTenants(prisma, [real.id])).toBe(0);
    expect((await rowCounts(real.id)).tenants).toBe(1);
  });

  it("cleanup removes only expired demo tenants", async () => {
    const expired = await createDemoTenant(-HOUR_MS);
    const active = await createDemoTenant(HOUR_MS);

    const removed = await cleanupExpiredDemoTenants(prisma);
    expect(removed).toBeGreaterThanOrEqual(1);
    expect((await rowCounts(expired.tenant.id)).tenants).toBe(0);
    expect((await rowCounts(active.tenant.id)).tenants).toBe(1);
  });
});
