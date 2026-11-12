import { randomUUID } from "node:crypto";
import { fakerEN as faker } from "@faker-js/faker";
import type { DispatchStatus, Prisma } from "@prisma/client";

const HOUR_MS = 60 * 60 * 1000;

// Approximate coordinates keep stops realistic and make distance calculations meaningful.
const DISTRICTS = [
  { name: "Kadikoy", lat: 40.9906, lng: 29.027 },
  { name: "Besiktas", lat: 41.0422, lng: 29.0067 },
  { name: "Uskudar", lat: 41.0256, lng: 29.0153 },
  { name: "Sisli", lat: 41.0602, lng: 28.9877 },
  { name: "Bakirkoy", lat: 40.9819, lng: 28.8772 },
  { name: "Atasehir", lat: 40.9923, lng: 29.1244 },
  { name: "Maltepe", lat: 40.935, lng: 29.131 },
  { name: "Beylikduzu", lat: 41.002, lng: 28.642 },
  { name: "Sariyer", lat: 41.167, lng: 29.057 },
  { name: "Fatih", lat: 41.0186, lng: 28.9395 },
];

const VEHICLE_MODELS = [
  "Ford Transit",
  "Mercedes Sprinter",
  "Fiat Doblo",
  "Renault Master",
  "Iveco Daily",
  "Volkswagen Crafter",
  "Peugeot Partner",
  "Ford Cargo 1833",
];
const ROUTE_THEMES = [
  "Morning Delivery",
  "Evening Pickup",
  "Corporate Delivery",
  "Weekend Service",
  "Express Shipping",
  "Hub Transfer",
];
const STOP_TYPES = ["Main Branch", "Distribution Point", "Customer Delivery", "Transfer Hub"];

const STATUS_FLOW: Record<DispatchStatus, DispatchStatus[]> = {
  PLANNED: ["PLANNED"],
  IN_PROGRESS: ["PLANNED", "IN_PROGRESS"],
  COMPLETED: ["PLANNED", "IN_PROGRESS", "COMPLETED"],
  CANCELLED: ["PLANNED", "CANCELLED"],
};

export type SeedCounts = {
  depots: number;
  vehicles: number;
  drivers: number;
  routes: number;
  dispatches: number;
};

// Small on purpose: the demo action runs inside a serverless request.
export const DEMO_COUNTS: SeedCounts = {
  depots: 2,
  vehicles: 10,
  drivers: 8,
  routes: 5,
  dispatches: 40,
};

export type SeedSummary = {
  depots: number;
  vehicles: number;
  routes: number;
  dispatches: number;
  drivers: Array<{ id: string; fullName: string }>;
};

export type SeedOptions = {
  // Prepended to depot names; the CLI uses it to find its own data again when cleaning up.
  namePrefix?: string;
};

function cycle<T>(items: T[], index: number): T {
  const item = items[index % items.length];
  if (item === undefined) throw new Error("List is empty");
  return item;
}

function jitter(): number {
  return (Math.random() - 0.5) * 0.008;
}

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function dispatchDate(offsetDays: number): Date {
  const date = daysFromNow(offsetDays);
  date.setHours(faker.number.int({ min: 6, max: 18 }), faker.number.int({ min: 0, max: 59 }));
  return date;
}

// Keep the dashboard's "upcoming renewals" populated, with some expiries within 30 days and a few in the past.
function randomExpiry(): Date {
  const roll = faker.number.int({ min: 1, max: 100 });
  if (roll <= 8) return daysFromNow(faker.number.int({ min: -60, max: -1 }));
  if (roll <= 30) return daysFromNow(faker.number.int({ min: 0, max: 30 }));
  return daysFromNow(faker.number.int({ min: 31, max: 540 }));
}

function randomPlate(): string {
  const city = faker.helpers.arrayElement(["34", "06", "35", "16", "41"]);
  const letters = faker.string.alpha({
    length: faker.number.int({ min: 1, max: 3 }),
    casing: "upper",
    exclude: ["Q", "W", "X"],
  });
  const digits = faker.string.numeric({
    length: faker.number.int({ min: 2, max: 4 }),
    allowLeadingZeros: false,
  });
  return `${city} ${letters} ${digits}`;
}

function pickSchedule(): { date: Date; status: DispatchStatus } {
  const when = faker.helpers.weightedArrayElement([
    { weight: 45, value: "past" as const },
    { weight: 25, value: "today" as const },
    { weight: 30, value: "future" as const },
  ]);

  if (when === "past") {
    return {
      date: dispatchDate(-faker.number.int({ min: 1, max: 30 })),
      status: faker.helpers.weightedArrayElement([
        { weight: 75, value: "COMPLETED" as const },
        { weight: 25, value: "CANCELLED" as const },
      ]),
    };
  }
  if (when === "today") {
    return {
      date: dispatchDate(0),
      status: faker.helpers.weightedArrayElement([
        { weight: 50, value: "IN_PROGRESS" as const },
        { weight: 30, value: "PLANNED" as const },
        { weight: 20, value: "COMPLETED" as const },
      ]),
    };
  }
  return {
    date: dispatchDate(faker.number.int({ min: 1, max: 14 })),
    status: faker.helpers.weightedArrayElement([
      { weight: 90, value: "PLANNED" as const },
      { weight: 10, value: "CANCELLED" as const },
    ]),
  };
}

// Keep status history consistent with the dispatch's final status and chronological.
function buildHistory(date: Date, status: DispatchStatus) {
  const now = Date.now();
  let cursor = Math.min(date.getTime(), now) - faker.number.int({ min: 2, max: 48 }) * HOUR_MS;
  return STATUS_FLOW[status].map((step) => {
    const entry = { status: step, changedAt: new Date(Math.min(cursor, now)) };
    cursor += faker.number.int({ min: 1, max: 6 }) * HOUR_MS;
    return entry;
  });
}

/**
 * Generates depots, vehicles, drivers, routes (with stops) and dispatches (with status
 * history) for one tenant. Users are NOT created here; callers own that part.
 *
 * Pass a transaction client so the whole seed is atomic. IDs are generated in the app so
 * related rows can reference each other and every table needs only one createMany query.
 */
export async function seedTenantData(
  db: Prisma.TransactionClient,
  tenantId: string,
  counts: SeedCounts,
  options: SeedOptions = {},
): Promise<SeedSummary> {
  const { namePrefix = "" } = options;

  const depotCount = Math.min(counts.depots, DISTRICTS.length);
  if (depotCount === 0) throw new Error("At least one depot is required");

  const depotDistricts = faker.helpers.shuffle([...DISTRICTS]).slice(0, depotCount);
  const depots = depotDistricts.map((district) => ({
    id: randomUUID(),
    tenantId,
    name: `${namePrefix}${district.name} Depot`,
  }));
  await db.depot.createMany({ data: depots });

  // Plates are unique per tenant (@@unique([tenantId, plate])), so only this tenant's plates matter.
  const existingPlates = new Set(
    (await db.vehicle.findMany({ where: { tenantId }, select: { plate: true } })).map(
      (vehicle) => vehicle.plate,
    ),
  );
  const uniquePlate = (): string => {
    for (;;) {
      const plate = randomPlate();
      if (!existingPlates.has(plate)) {
        existingPlates.add(plate);
        return plate;
      }
    }
  };

  const vehicles = Array.from({ length: counts.vehicles }, (_, i) => ({
    id: randomUUID(),
    tenantId,
    depotId: cycle(depots, i).id,
    plate: uniquePlate(),
    model:
      faker.number.int({ min: 1, max: 10 }) === 1
        ? null
        : faker.helpers.arrayElement(VEHICLE_MODELS),
    insuranceUntil: faker.number.int({ min: 1, max: 10 }) === 1 ? null : randomExpiry(),
    inspectionUntil: faker.number.int({ min: 1, max: 10 }) === 1 ? null : randomExpiry(),
  }));
  await db.vehicle.createMany({ data: vehicles });

  const drivers = Array.from({ length: counts.drivers }, (_, i) => ({
    id: randomUUID(),
    depotId: cycle(depots, i).id,
    fullName: faker.person.fullName(),
    licenseUntil: randomExpiry(),
  }));
  await db.driver.createMany({ data: drivers });

  const routes = Array.from({ length: counts.routes }, (_, i) => ({
    id: randomUUID(),
    depotId: cycle(depots, i).id,
    name: `${faker.helpers.arrayElement(ROUTE_THEMES)} ${i + 1}`,
  }));
  await db.route.createMany({ data: routes });

  const stops = routes.flatMap((route) => {
    const stopDistricts = faker.helpers
      .shuffle([...DISTRICTS])
      .slice(0, faker.number.int({ min: 3, max: 6 }));
    return stopDistricts.map((district, order) => ({
      routeId: route.id,
      label: `${district.name} ${faker.helpers.arrayElement(STOP_TYPES)}`,
      lat: district.lat + jitter(),
      lng: district.lng + jitter(),
      order: order + 1,
    }));
  });
  await db.routeStop.createMany({ data: stops });

  // Match each dispatch with a vehicle, driver, and route from the same depot.
  const groups = depots
    .map((depot) => ({
      vehicles: vehicles.filter((vehicle) => vehicle.depotId === depot.id),
      drivers: drivers.filter((driver) => driver.depotId === depot.id),
      routes: routes.filter((route) => route.depotId === depot.id),
    }))
    .filter(
      (group) => group.vehicles.length > 0 && group.drivers.length > 0 && group.routes.length > 0,
    );

  const dispatches: Array<{
    id: string;
    vehicleId: string;
    driverId: string;
    routeId: string;
    date: Date;
    status: DispatchStatus;
  }> = [];
  const history: Array<{ dispatchId: string; status: DispatchStatus; changedAt: Date }> = [];

  if (groups.length > 0) {
    for (let i = 0; i < counts.dispatches; i++) {
      const group = faker.helpers.arrayElement(groups);
      const { date, status } = pickSchedule();
      const id = randomUUID();
      dispatches.push({
        id,
        vehicleId: faker.helpers.arrayElement(group.vehicles).id,
        driverId: faker.helpers.arrayElement(group.drivers).id,
        routeId: faker.helpers.arrayElement(group.routes).id,
        date,
        status,
      });
      for (const entry of buildHistory(date, status)) {
        history.push({ dispatchId: id, ...entry });
      }
    }
  }
  await db.dispatch.createMany({ data: dispatches });
  await db.dispatchStatusHistory.createMany({ data: history });

  return {
    depots: depots.length,
    vehicles: vehicles.length,
    routes: routes.length,
    dispatches: dispatches.length,
    drivers: drivers.map(({ id, fullName }) => ({ id, fullName })),
  };
}
