import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createDemoTenant, DEMO_TTL_MS } from "@/lib/demo/create-demo";
import { countActiveDemoTenants, deleteDemoTenants } from "@/lib/demo/cleanup";
import { coreDemoEmail } from "@/lib/demo/guards";

const createdIds: string[] = [];

async function newDemo() {
  const demo = await createDemoTenant(prisma);
  createdIds.push(demo.tenantId);
  return demo;
}

afterAll(async () => {
  await deleteDemoTenants(prisma, createdIds);
  await prisma.$disconnect();
});

describe("createDemoTenant", () => {
  it("creates a 24h demo tenant with three core users and no platform admin", async () => {
    const before = await countActiveDemoTenants(prisma);
    const demo = await newDemo();

    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: demo.tenantId } });
    expect(tenant.isDemo).toBe(true);
    const ttl = tenant.expiresAt!.getTime() - Date.now();
    expect(ttl).toBeGreaterThan(DEMO_TTL_MS - 60_000);
    expect(ttl).toBeLessThanOrEqual(DEMO_TTL_MS);
    expect(await countActiveDemoTenants(prisma)).toBe(before + 1);

    const users = await prisma.user.findMany({ where: { tenantId: demo.tenantId } });
    expect(users.map((user) => user.role).sort()).toEqual(["ADMIN", "DISPATCHER", "DRIVER"]);
    expect(users.every((user) => !user.isPlatformAdmin)).toBe(true);
    for (const user of users) {
      expect(user.email).toBe(coreDemoEmail(demo.tenantId, user.role));
      expect(user.email.endsWith("@demo.invalid")).toBe(true);
    }
  });

  it("links the DRIVER user to a driver of the same tenant that has dispatches", async () => {
    const demo = await newDemo();
    const driver = await prisma.driver.findUniqueOrThrow({
      where: { userId: demo.userIds.DRIVER },
      include: { depot: true },
    });
    expect(driver.depot.tenantId).toBe(demo.tenantId);
    expect(await prisma.dispatch.count({ where: { driverId: driver.id } })).toBeGreaterThan(0);
  });

  it("seeds audit entries written by the demo admin", async () => {
    const demo = await newDemo();
    const entries = await prisma.auditLog.findMany({ where: { tenantId: demo.tenantId } });
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => entry.actorId === demo.userIds.ADMIN)).toBe(true);
  });

  it("keeps two demos fully separate", async () => {
    const a = await newDemo();
    const b = await newDemo();
    const bUsersBefore = await prisma.user.count({ where: { tenantId: b.tenantId } });
    const bVehiclesBefore = await prisma.vehicle.count({ where: { tenantId: b.tenantId } });

    await deleteDemoTenants(prisma, [a.tenantId]);

    expect(await prisma.user.count({ where: { tenantId: a.tenantId } })).toBe(0);
    expect(await prisma.user.count({ where: { tenantId: b.tenantId } })).toBe(bUsersBefore);
    expect(await prisma.vehicle.count({ where: { tenantId: b.tenantId } })).toBe(bVehiclesBefore);
    expect(await prisma.auditLog.count({ where: { tenantId: b.tenantId } })).toBeGreaterThan(0);
  });
});
