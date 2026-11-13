import { parseArgs } from "node:util";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { seedTenantData, type SeedCounts } from "../src/lib/demo/seed-tenant-data";

const prisma = new PrismaClient();

const MOCK_PREFIX = "[Mock] ";
const MOCK_EMAIL_DOMAIN = "mock.trekker.dev";

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

async function createTestUsers(tenantId: string, drivers: Array<{ id: string; fullName: string }>) {
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

  const counts: SeedCounts = {
    depots: readCount(values.depots, "depots"),
    vehicles: readCount(values.vehicles, "vehicles"),
    drivers: readCount(values.drivers, "drivers"),
    routes: readCount(values.routes, "routes"),
    dispatches: readCount(values.dispatches, "dispatches"),
  };

  const summary = await prisma.$transaction(
    (tx) => seedTenantData(tx, owner.tenantId, counts, { namePrefix: MOCK_PREFIX }),
    { timeout: 60_000, maxWait: 10_000 },
  );

  if (counts.dispatches > 0 && summary.dispatches === 0) {
    console.warn(
      "Warning: no depot has a vehicle, driver, and route; no dispatches were generated.",
    );
  }
  console.log(
    `Created: ${summary.depots} depots, ${summary.vehicles} vehicles, ${summary.drivers.length} drivers, ` +
      `${summary.routes} routes, ${summary.dispatches} dispatches`,
  );

  if (!values["skip-users"]) {
    await createTestUsers(owner.tenantId, summary.drivers);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
