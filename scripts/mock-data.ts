import { parseArgs } from "node:util";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { fakerEN as faker } from "@faker-js/faker";
import { PrismaClient, type DispatchStatus } from "@prisma/client";

const prisma = new PrismaClient();

const MOCK_PREFIX = "[Mock] ";
const MOCK_EMAIL_DOMAIN = "mock.trekker.dev";
const HOUR_MS = 60 * 60 * 1000;
const BATCH_SIZE = 10;

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

// Usage:
//   npm run mock:seed
//   npm run mock:seed -- --dispatches 200 --vehicles 40
//   npm run mock:seed -- --email another-user@example.com --skip-users
//   npm run mock:reset
//   npm run mock:clean
// Set counts with --depots, --vehicles, --drivers, --routes, and --dispatches (0-500).
// Seeding requires at least one depot. Arguments after `--` are passed to this script.

const { values } = parseArgs({
  options: {
    email: { type: "string", default: "admin@trekker.dev" },
    clean: { type: "boolean", default: false },
    reset: { type: "boolean", default: false },
    "skip-users": { type: "boolean", default: false },
    depots: { type: "string", default: "3" },
    vehicles: { type: "string", default: "24" },
    drivers: { type: "string", default: "20" },
    routes: { type: "string", default: "8" },
    dispatches: { type: "string", default: "80" },
  },
});

function readCount(raw: string | undefined, name: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 500) {
    throw new Error(`--${name} must be an integer between 0 and 500 (received: ${raw})`);
  }
  return value;
}

function cycle<T>(items: T[], index: number): T {
  const item = items[index % items.length];
  if (item === undefined) throw new Error("List is empty");
  return item;
}

// Process work in small batches to avoid overwhelming the connection pool.
async function inBatches<T>(total: number, task: (index: number) => Promise<T>): Promise<T[]> {
  const results: T[] = [];
  for (let start = 0; start < total; start += BATCH_SIZE) {
    const size = Math.min(BATCH_SIZE, total - start);
    const batch = await Promise.all(
      Array.from({ length: size }, (_, offset) => task(start + offset)),
    );
    results.push(...batch);
  }
  return results;
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

function describeDatabase(): string {
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    return `${url.host}${url.pathname}`;
  } catch {
    return "unknown";
  }
}

async function cleanMockData(tenantId: string) {
  const mockDepots = { tenantId, name: { startsWith: MOCK_PREFIX } };

  // Order matters: Vehicle/Driver/Route -> Depot relations use RESTRICT, so delete dependents first.
  // Deleting a dispatch cascades to status history; deleting a route cascades to its stops.
  const [dispatches, routes, vehicles, drivers, depots, users] = await prisma.$transaction([
    prisma.dispatch.deleteMany({
      where: {
        OR: [
          { vehicle: { depot: mockDepots } },
          { driver: { depot: mockDepots } },
          { route: { depot: mockDepots } },
        ],
      },
    }),
    prisma.route.deleteMany({ where: { depot: mockDepots } }),
    prisma.vehicle.deleteMany({ where: { depot: mockDepots } }),
    prisma.driver.deleteMany({ where: { depot: mockDepots } }),
    prisma.depot.deleteMany({ where: mockDepots }),
    prisma.user.deleteMany({
      where: { tenantId, email: { endsWith: `@${MOCK_EMAIL_DOMAIN}` } },
    }),
  ]);

  console.log(
    `Removed: ${dispatches.count} dispatches, ${routes.count} routes, ${vehicles.count} vehicles, ` +
      `${drivers.count} drivers, ${depots.count} depots, ${users.count} users`,
  );
}

type Counts = {
  depots: number;
  vehicles: number;
  drivers: number;
  routes: number;
  dispatches: number;
};

async function seedMockData(tenantId: string, counts: Counts, withUsers: boolean) {
  const depotCount = Math.min(counts.depots, DISTRICTS.length);
  if (depotCount === 0) throw new Error("--depots must be at least 1");

  const depotDistricts = faker.helpers.shuffle([...DISTRICTS]).slice(0, depotCount);
  const depots = await inBatches(depotCount, (i) =>
    prisma.depot.create({
      data: { tenantId, name: `${MOCK_PREFIX}${cycle(depotDistricts, i).name} Depot` },
    }),
  );

  // Plates must be unique across the table, so avoid collisions with existing plates.
  const existingPlates = new Set(
    (await prisma.vehicle.findMany({ select: { plate: true } })).map((vehicle) => vehicle.plate),
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

  const vehicles = await inBatches(counts.vehicles, (i) =>
    prisma.vehicle.create({
      data: {
        depotId: cycle(depots, i).id,
        plate: uniquePlate(),
        model:
          faker.number.int({ min: 1, max: 10 }) === 1
            ? null
            : faker.helpers.arrayElement(VEHICLE_MODELS),
        insuranceUntil: faker.number.int({ min: 1, max: 10 }) === 1 ? null : randomExpiry(),
        inspectionUntil: faker.number.int({ min: 1, max: 10 }) === 1 ? null : randomExpiry(),
      },
    }),
  );

  const drivers = await inBatches(counts.drivers, (i) =>
    prisma.driver.create({
      data: {
        depotId: cycle(depots, i).id,
        fullName: faker.person.fullName(),
        licenseUntil: randomExpiry(),
      },
    }),
  );

  const routes = await inBatches(counts.routes, (i) => {
    const stopDistricts = faker.helpers
      .shuffle([...DISTRICTS])
      .slice(0, faker.number.int({ min: 3, max: 6 }));
    return prisma.route.create({
      data: {
        depotId: cycle(depots, i).id,
        name: `${faker.helpers.arrayElement(ROUTE_THEMES)} ${i + 1}`,
        stops: {
          create: stopDistricts.map((district, order) => ({
            label: `${district.name} ${faker.helpers.arrayElement(STOP_TYPES)}`,
            lat: district.lat + jitter(),
            lng: district.lng + jitter(),
            order: order + 1,
          })),
        },
      },
    });
  });

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

  let dispatchTotal = 0;
  if (counts.dispatches > 0 && groups.length === 0) {
    console.warn(
      "Warning: no depot has a vehicle, driver, and route; no dispatches were generated.",
    );
  } else {
    const dispatches = await inBatches(counts.dispatches, () => {
      const group = faker.helpers.arrayElement(groups);
      const { date, status } = pickSchedule();
      return prisma.dispatch.create({
        data: {
          vehicleId: faker.helpers.arrayElement(group.vehicles).id,
          driverId: faker.helpers.arrayElement(group.drivers).id,
          routeId: faker.helpers.arrayElement(group.routes).id,
          date,
          status,
          statusHistory: { create: buildHistory(date, status) },
        },
      });
    });
    dispatchTotal = dispatches.length;
  }

  console.log(
    `Created: ${depots.length} depots, ${vehicles.length} vehicles, ${drivers.length} drivers, ` +
      `${routes.length} routes, ${dispatchTotal} dispatches`,
  );

  if (!withUsers) return;

  // The password is not hard-coded: it is generated randomly each run and printed only to the terminal.
  const password = randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 10);

  const existingEmails = new Set(
    (
      await prisma.user.findMany({
        where: { tenantId, email: { endsWith: `@${MOCK_EMAIL_DOMAIN}` } },
        select: { email: true },
      })
    ).map((user) => user.email),
  );
  const nextFreeEmail = (prefix: string): string => {
    let n = 1;
    while (existingEmails.has(`${prefix}${n}@${MOCK_EMAIL_DOMAIN}`)) n++;
    const email = `${prefix}${n}@${MOCK_EMAIL_DOMAIN}`;
    existingEmails.add(email);
    return email;
  };

  const createdAccounts: string[] = [];

  const dispatcherEmail = nextFreeEmail("dispatcher");
  await prisma.user.create({
    data: { email: dispatcherEmail, passwordHash, role: "DISPATCHER", tenantId },
  });
  createdAccounts.push(`${dispatcherEmail} (DISPATCHER)`);

  for (const driver of drivers.slice(0, 3)) {
    const email = nextFreeEmail("driver");
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "DRIVER",
        tenantId,
        driver: { connect: { id: driver.id } },
      },
    });
    createdAccounts.push(`${email} (DRIVER → ${driver.fullName})`);
  }

  console.log("\nTest accounts (password shown only this time):");
  createdAccounts.forEach((account) => console.log(`  ${account}`));
  console.log(`  Password: ${password}`);
}

async function main() {
  const owner = await prisma.user.findUnique({
    where: { email: values.email },
    select: { tenantId: true, tenant: { select: { name: true } } },
  });
  if (!owner) {
    throw new Error(`User not found: ${values.email} (provide an existing user with --email)`);
  }

  console.log(`Database: ${describeDatabase()}`);
  console.log(`Tenant: ${owner.tenant.name} (${values.email})\n`);

  if (values.clean || values.reset) {
    await cleanMockData(owner.tenantId);
  }
  if (values.clean) return;

  await seedMockData(
    owner.tenantId,
    {
      depots: readCount(values.depots, "depots"),
      vehicles: readCount(values.vehicles, "vehicles"),
      drivers: readCount(values.drivers, "drivers"),
      routes: readCount(values.routes, "routes"),
      dispatches: readCount(values.dispatches, "dispatches"),
    },
    !values["skip-users"],
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
