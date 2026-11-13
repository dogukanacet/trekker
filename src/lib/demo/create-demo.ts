import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { PrismaClient, Role } from "@prisma/client";
import { diffRecords } from "@/lib/audit/diff";
import { writeAudit } from "@/lib/audit/write";
import { DEMO_COUNTS, seedTenantData } from "./seed-tenant-data";
import { coreDemoEmail } from "./guards";

export const DEMO_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_ACTIVE_DEMOS = 50;

const ROLES: Role[] = ["ADMIN", "DISPATCHER", "DRIVER"];

export type DemoTenant = {
  tenantId: string;
  expiresAt: Date;
  userIds: Record<Role, string>;
};

/**
 * Creates one disposable tenant with seeded data and an ADMIN, DISPATCHER and DRIVER user.
 * Everything happens in one transaction, so a failure never leaves a half-built demo behind.
 */
export async function createDemoTenant(db: PrismaClient): Promise<DemoTenant> {
  // Random and never shown: these accounts can only be entered through a server-signed ticket.
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
  const expiresAt = new Date(Date.now() + DEMO_TTL_MS);

  return db.$transaction(
    async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: "Demo Logistics", isDemo: true, expiresAt },
      });
      const summary = await seedTenantData(tx, tenant.id, DEMO_COUNTS);

      // Give the DRIVER account the busiest driver so its dashboard is not empty.
      const busiest = await tx.dispatch.groupBy({
        by: ["driverId"],
        where: { driverId: { in: summary.drivers.map((driver) => driver.id) } },
        _count: { _all: true },
        orderBy: { _count: { driverId: "desc" } },
        take: 1,
      });
      const driverId = busiest[0]?.driverId ?? summary.drivers[0]?.id;
      if (!driverId) throw new Error("Demo seed produced no drivers");

      const userIds = {} as Record<Role, string>;
      let adminEmail = "";
      for (const role of ROLES) {
        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: coreDemoEmail(tenant.id, role),
            passwordHash,
            role,
            isPlatformAdmin: false, // never true in a demo: the translation panel affects every tenant
            ...(role === "DRIVER" ? { driver: { connect: { id: driverId } } } : {}),
          },
          select: { id: true, email: true },
        });
        userIds[role] = user.id;
        if (role === "ADMIN") adminEmail = user.email;
      }

      // A few audit entries so the audit log page is not empty on first visit.
      const actor = { id: userIds.ADMIN, email: adminEmail };
      const vehicles = await tx.vehicle.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "asc" },
        take: 3,
        select: { id: true, plate: true, model: true },
      });
      for (const vehicle of vehicles) {
        await writeAudit(tx, {
          tenantId: tenant.id,
          actor,
          action: "CREATE",
          resource: "vehicles",
          resourceId: vehicle.id,
          resourceLabel: vehicle.plate,
          changes: diffRecords({}, { plate: vehicle.plate, model: vehicle.model }),
        });
      }
      const dispatches = await tx.dispatch.findMany({
        where: { vehicle: { tenantId: tenant.id }, status: { in: ["IN_PROGRESS", "COMPLETED"] } },
        take: 3,
        select: {
          id: true,
          status: true,
          route: { select: { name: true } },
          vehicle: { select: { plate: true } },
        },
      });
      for (const dispatch of dispatches) {
        await writeAudit(tx, {
          tenantId: tenant.id,
          actor,
          action: "STATUS_CHANGE",
          resource: "dispatches",
          resourceId: dispatch.id,
          resourceLabel: `${dispatch.vehicle.plate} · ${dispatch.route.name}`,
          changes: diffRecords({ status: "PLANNED" }, { status: dispatch.status }),
        });
      }

      return { tenantId: tenant.id, expiresAt, userIds };
    },
    { timeout: 20_000, maxWait: 10_000 },
  );
}
