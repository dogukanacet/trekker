import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Role } from "@prisma/client";
import type { Action, Resource } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Actor = {
  tenantId: string;
  role: Role;
  userId: string;
  email: string;
  driverId: string | null;
};

const session = vi.hoisted(() => ({ actor: null as Actor | null }));

vi.mock("@/lib/authorize", async () => {
  const { hasPermission } = await import("@/lib/permissions");
  return {
    // Mirrors the real authorize(): same permission matrix, identity comes from the test.
    authorize: async (resource: Resource, action: Action) => {
      const actor = session.actor;
      if (!actor) return { ok: false as const, error: "unauthenticated" };
      if (!hasPermission(actor.role, resource, action)) {
        return { ok: false as const, error: "forbidden" };
      }
      return { ok: true as const, t: (key: string) => key, ...actor };
    },
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getLocale: async () => "tr",
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/lib/resend", () => ({ resend: { emails: { send: vi.fn() } } }));

import * as depots from "@/app/[locale]/(dashboard)/depots/actions";
import * as drivers from "@/app/[locale]/(dashboard)/drivers/actions";
import * as vehicles from "@/app/[locale]/(dashboard)/vehicles/actions";
import * as routes from "@/app/[locale]/(dashboard)/routes/actions";
import * as stops from "@/app/[locale]/(dashboard)/routes/[routeId]/actions";
import * as dispatches from "@/app/[locale]/(dashboard)/dispatches/actions";
import * as users from "@/app/[locale]/(dashboard)/users/actions";
import { getVehicleRows } from "@/app/[locale]/(dashboard)/vehicles/query";
import { getDispatchRows } from "@/app/[locale]/(dashboard)/dispatches/query";
import { getAuditRows } from "@/app/[locale]/(dashboard)/audit-log/query";

const RUN = Date.now().toString(36).toUpperCase();
const PREV = { error: null, success: false };
const PAGE = { skip: 0, take: 100 };

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
};

// Mirrors the real form: the model input is always submitted (possibly empty).
const vehicleForm = (fields: Record<string, string>) => form({ model: "", ...fields });

async function createTenant(label: string) {
  const tag = `${label.toUpperCase()}-${RUN}`;
  const tenant = await prisma.tenant.create({ data: { name: `itest-${tag}` } });
  const tenantId = tenant.id;
  const depot = await prisma.depot.create({ data: { name: `${tag} depot`, tenantId } });
  const emptyDepot = await prisma.depot.create({ data: { name: `${tag} empty`, tenantId } });
  const mkUser = (suffix: string, role: Role) =>
    prisma.user.create({
      data: {
        email: `${suffix}-${tag}@itest.local`.toLowerCase(),
        passwordHash: "x",
        role,
        tenantId,
      },
    });
  const admin = await mkUser("admin", "ADMIN");
  const driverUser = await mkUser("driver", "DRIVER");
  const mkDriver = (name: string, userId?: string) =>
    prisma.driver.create({
      data: {
        depotId: depot.id,
        fullName: `${tag} ${name}`,
        licenseUntil: new Date("2030-01-01"),
        userId,
      },
    });
  const driver = await mkDriver("driver", driverUser.id);
  const otherDriver = await mkDriver("other");
  const idleDriver = await mkDriver("idle");
  const mkVehicle = (suffix: string) =>
    prisma.vehicle.create({ data: { tenantId, depotId: depot.id, plate: `${tag}-${suffix}` } });
  const vehicle = await mkVehicle("V");
  const idleVehicle = await mkVehicle("IDLE");
  const mkRoute = (name: string) =>
    prisma.route.create({
      data: {
        depotId: depot.id,
        name: `${tag} ${name}`,
        stops: { create: [{ label: "s1", lat: 41, lng: 29, order: 1 }] },
      },
      include: { stops: true },
    });
  const route = await mkRoute("route");
  const idleRoute = await mkRoute("idle");
  const mkDispatch = async (driverId: string) => {
    const d = await prisma.dispatch.create({
      data: { vehicleId: vehicle.id, driverId, routeId: route.id },
    });
    await prisma.dispatchStatusHistory.create({ data: { dispatchId: d.id, status: d.status } });
    return d;
  };
  const dispatch = await mkDispatch(driver.id);
  const otherDispatch = await mkDispatch(otherDriver.id);

  const stop = route.stops[0];
  if (!stop) throw new Error("fixture: route has no stop");

  return {
    tenant,
    depot,
    emptyDepot,
    admin,
    driver,
    otherDriver,
    idleDriver,
    vehicle,
    idleVehicle,
    route,
    idleRoute,
    stop,
    dispatch,
    otherDispatch,
  };
}
type Fixture = Awaited<ReturnType<typeof createTenant>>;

async function cleanup(tenantIds: string[]) {
  const byTenant = { in: tenantIds };
  await prisma.auditLog.deleteMany({ where: { tenantId: byTenant } });
  await prisma.dispatch.deleteMany({ where: { vehicle: { depot: { tenantId: byTenant } } } });
  await prisma.vehicle.deleteMany({ where: { tenantId: byTenant } });
  await prisma.driver.deleteMany({ where: { depot: { tenantId: byTenant } } });
  await prisma.route.deleteMany({ where: { depot: { tenantId: byTenant } } });
  await prisma.user.deleteMany({ where: { tenantId: byTenant } });
  await prisma.depot.deleteMany({ where: { tenantId: byTenant } });
  await prisma.tenant.deleteMany({ where: { id: byTenant } });
}

// Everything that belongs to a tenant, including relation counts, so a foreign dispatch
// pointing at one of its vehicles/drivers/routes shows up as a change too.
async function snapshot(tenantId: string) {
  const dispatchCount = { _count: { select: { dispatches: true } } };
  const [depotRows, vehicleRows, driverRows, routeRows, dispatchRows, userRows, audit] =
    await Promise.all([
      prisma.depot.findMany({ where: { tenantId }, orderBy: { id: "asc" } }),
      prisma.vehicle.findMany({
        where: { depot: { tenantId } },
        include: dispatchCount,
        orderBy: { id: "asc" },
      }),
      prisma.driver.findMany({
        where: { depot: { tenantId } },
        include: dispatchCount,
        orderBy: { id: "asc" },
      }),
      prisma.route.findMany({
        where: { depot: { tenantId } },
        include: { stops: { orderBy: { order: "asc" } }, ...dispatchCount },
        orderBy: { id: "asc" },
      }),
      prisma.dispatch.findMany({
        where: { vehicle: { depot: { tenantId } } },
        include: { statusHistory: { orderBy: { id: "asc" } } },
        orderBy: { id: "asc" },
      }),
      prisma.user.findMany({ where: { tenantId }, orderBy: { id: "asc" } }),
      prisma.auditLog.count({ where: { tenantId } }),
    ]);
  return { depotRows, vehicleRows, driverRows, routeRows, dispatchRows, userRows, audit };
}

const adminOf = (f: Fixture): Actor => ({
  tenantId: f.tenant.id,
  role: "ADMIN",
  userId: f.admin.id,
  email: f.admin.email,
  driverId: null,
});
const actAs = (actor: Actor) => {
  session.actor = actor;
};

describe("tenant isolation", () => {
  let A: Fixture;
  let B: Fixture;

  beforeAll(async () => {
    A = await createTenant("a");
    B = await createTenant("b");
  });

  afterAll(async () => {
    await cleanup([A.tenant.id, B.tenant.id]);
    await prisma.$disconnect();
  });

  const attacks: Array<{ name: string; run: (A: Fixture, B: Fixture) => Promise<unknown> }> = [
    {
      name: "move A's vehicle into B's depot",
      run: (a, b) =>
        vehicles.updateVehicle(
          a.vehicle.id,
          PREV,
          vehicleForm({ depotId: b.depot.id, plate: "HIJACK" }),
        ),
    },
    {
      name: "rename A's vehicle through B's depot",
      run: (a, b) =>
        vehicles.updateVehicle(
          a.vehicle.id,
          PREV,
          vehicleForm({ depotId: b.depot.id, plate: "B-OWNED" }),
        ),
    },
    { name: "delete A's idle vehicle", run: (a) => vehicles.deleteVehicle(a.idleVehicle.id, PREV) },
    {
      name: "create a vehicle in A's depot",
      run: (a) =>
        vehicles.createVehicle(PREV, vehicleForm({ depotId: a.depot.id, plate: "INTRUDER" })),
    },
    {
      name: "update A's driver",
      run: (a, b) =>
        drivers.updateDriver(
          a.driver.id,
          PREV,
          form({ depotId: b.depot.id, fullName: "HIJACK", licenseUntil: "2031-01-01" }),
        ),
    },
    { name: "delete A's idle driver", run: (a) => drivers.deleteDriver(a.idleDriver.id, PREV) },
    {
      name: "create a driver in A's depot",
      run: (a) =>
        drivers.createDriver(
          PREV,
          form({ depotId: a.depot.id, fullName: "INTRUDER", licenseUntil: "2031-01-01" }),
        ),
    },
    {
      name: "update A's route",
      run: (a, b) =>
        routes.updateRoute(a.route.id, PREV, form({ depotId: b.depot.id, name: "HIJACK" })),
    },
    { name: "delete A's idle route", run: (a) => routes.deleteRoute(a.idleRoute.id, PREV) },
    {
      name: "create a route in A's depot",
      run: (a) => routes.createRoute(PREV, form({ depotId: a.depot.id, name: "INTRUDER" })),
    },
    {
      name: "add a stop to A's route",
      run: (a) =>
        stops.addStop(a.route.id, PREV, form({ label: "INTRUDER", lat: "41", lng: "29" })),
    },
    { name: "delete A's stop", run: (a) => stops.deleteStop(a.stop.id, a.route.id, PREV) },
    {
      name: "delete A's stop through B's route id",
      run: (a, b) => stops.deleteStop(a.stop.id, b.route.id, PREV),
    },
    {
      name: "rename A's depot",
      run: (a) => depots.updateDepot(a.depot.id, PREV, form({ name: "HIJACK" })),
    },
    { name: "delete A's empty depot", run: (a) => depots.deleteDepot(a.emptyDepot.id, PREV) },
    {
      name: "update A's dispatch with B's records",
      run: (a, b) =>
        dispatches.updateDispatch(
          a.dispatch.id,
          PREV,
          form({
            routeId: b.route.id,
            driverId: b.driver.id,
            vehicleId: b.vehicle.id,
            status: "COMPLETED",
          }),
        ),
    },
    {
      name: "point B's dispatch at A's records",
      run: (a, b) =>
        dispatches.updateDispatch(
          b.dispatch.id,
          PREV,
          form({
            routeId: a.route.id,
            driverId: a.driver.id,
            vehicleId: a.vehicle.id,
            status: "PLANNED",
          }),
        ),
    },
    {
      name: "create a dispatch from A's records",
      run: (a) =>
        dispatches.createDispatch(
          PREV,
          form({ routeId: a.route.id, driverId: a.driver.id, vehicleId: a.vehicle.id }),
        ),
    },
    { name: "delete A's dispatch", run: (a) => dispatches.deleteDispatch(a.dispatch.id, PREV) },
    {
      name: "advance A's dispatch status",
      run: (a) => dispatches.advanceDispatchStatus(a.dispatch.id, "PLANNED", PREV),
    },
    {
      name: "change A's user role",
      run: (a) =>
        users.updateUser(a.admin.id, PREV, form({ role: "DRIVER", driverId: a.idleDriver.id })),
    },
    {
      name: "link A's driver to B's user",
      run: (a, b) =>
        users.updateUser(b.admin.id, PREV, form({ role: "DRIVER", driverId: a.idleDriver.id })),
    },
    { name: "delete A's user", run: (a) => users.deleteUser(a.admin.id, PREV) },
  ];

  for (const { name, run } of attacks) {
    it(`B cannot ${name}`, async () => {
      const before = await snapshot(A.tenant.id);
      actAs(adminOf(B));
      const result = (await run(A, B)) as { error?: string | null } | undefined;
      // The attack must reach the tenant checks: a validation error would make this test vacuous.
      expect(result?.error).not.toBe("validationFailed");
      expect(await snapshot(A.tenant.id)).toEqual(before);
    });
  }

  it("B cannot read A's dispatch detail", async () => {
    actAs(adminOf(B));
    const result = await dispatches.getDispatchDetail(A.dispatch.id);
    expect(result.dispatch).toBeNull();
  });

  it("list queries never return another tenant's rows", async () => {
    // Give A at least one audit row so the check below cannot pass vacuously.
    actAs(adminOf(A));
    await vehicles.updateVehicle(
      A.vehicle.id,
      PREV,
      vehicleForm({ depotId: A.depot.id, plate: A.vehicle.plate, model: "Audited" }),
    );

    const aAuditIds = (
      await prisma.auditLog.findMany({ where: { tenantId: A.tenant.id }, select: { id: true } })
    ).map((r) => r.id);
    expect(aAuditIds.length).toBeGreaterThan(0);

    const vehicleIds = (await getVehicleRows({}, B.tenant.id, PAGE)).map((r) => r.id);
    expect(vehicleIds).not.toContain(A.vehicle.id);

    const dispatchRows = await getDispatchRows(
      {},
      { tenantId: B.tenant.id, role: "ADMIN", driverId: null },
      PAGE,
    );
    expect(dispatchRows.map((r) => r.id)).not.toContain(A.dispatch.id);

    const auditIds = (await getAuditRows({}, B.tenant.id, PAGE)).map((r) => r.id);
    for (const id of aAuditIds) expect(auditIds).not.toContain(id);
  });
});

describe("roles inside one tenant", () => {
  let A: Fixture;

  beforeAll(async () => {
    A = await createTenant("r");
  });
  afterAll(async () => {
    await cleanup([A.tenant.id]);
  });

  const as = (role: Role): Actor => ({ ...adminOf(A), role });

  it("a DISPATCHER cannot manage users", async () => {
    const before = await snapshot(A.tenant.id);
    actAs(as("DISPATCHER"));
    const result = await users.updateUser(A.admin.id, PREV, form({ role: "DISPATCHER" }));
    expect(result.error).toBe("forbidden");
    expect(await snapshot(A.tenant.id)).toEqual(before);
  });

  it("a DRIVER cannot edit vehicles", async () => {
    const before = await snapshot(A.tenant.id);
    actAs(as("DRIVER"));
    const result = await vehicles.updateVehicle(
      A.vehicle.id,
      PREV,
      form({ depotId: A.depot.id, plate: "X" }),
    );
    expect(result.error).toBe("forbidden");
    expect(await snapshot(A.tenant.id)).toEqual(before);
  });

  it("a DRIVER cannot advance another driver's dispatch", async () => {
    const before = await snapshot(A.tenant.id);
    actAs({ ...as("DRIVER"), driverId: A.driver.id });
    await dispatches.advanceDispatchStatus(A.otherDispatch.id, "PLANNED", PREV);
    expect(await snapshot(A.tenant.id)).toEqual(before);
  });

  it("a DRIVER can advance their own dispatch", async () => {
    actAs({ ...as("DRIVER"), driverId: A.driver.id });
    const result = await dispatches.advanceDispatchStatus(A.dispatch.id, "PLANNED", PREV);
    expect(result.success).toBe(true);
    const row = await prisma.dispatch.findUniqueOrThrow({ where: { id: A.dispatch.id } });
    expect(row.status).toBe("IN_PROGRESS");
  });
});

describe("positive controls and plate scoping", () => {
  let A: Fixture;
  let B: Fixture;

  beforeAll(async () => {
    A = await createTenant("c");
    B = await createTenant("d");
  });
  afterAll(async () => {
    await cleanup([A.tenant.id, B.tenant.id]);
  });

  it("A can update its own vehicle and an audit row is written", async () => {
    actAs(adminOf(A));
    const before = await prisma.auditLog.count({ where: { tenantId: A.tenant.id } });
    const result = await vehicles.updateVehicle(
      A.vehicle.id,
      PREV,
      form({
        depotId: A.depot.id,
        plate: A.vehicle.plate,
        model: "Updated",
      }),
    );
    expect(result.success).toBe(true);
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: A.vehicle.id } })).model).toBe(
      "Updated",
    );
    expect(await prisma.auditLog.count({ where: { tenantId: A.tenant.id } })).toBe(before + 1);
  });

  it("the same plate can exist in two different tenants", async () => {
    actAs(adminOf(B));
    const result = await vehicles.createVehicle(
      PREV,
      vehicleForm({ depotId: B.depot.id, plate: A.vehicle.plate }),
    );
    expect(result.success).toBe(true);
  });

  it("a duplicate plate inside one tenant is rejected", async () => {
    actAs(adminOf(A));
    const result = await vehicles.createVehicle(
      PREV,
      vehicleForm({ depotId: A.depot.id, plate: A.vehicle.plate }),
    );
    expect(result.error).toBe("plateInUse");
  });
});
