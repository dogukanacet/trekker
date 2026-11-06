-- Normalize plates so "34abc " and "34ABC" cannot coexist inside one tenant.
UPDATE "Vehicle" SET plate = upper(trim(plate));

-- New column: nullable first so existing rows are accepted.
ALTER TABLE "Vehicle" ADD COLUMN "tenantId" TEXT;

-- Backfill from the depot each vehicle already belongs to.
UPDATE "Vehicle" v SET "tenantId" = d."tenantId" FROM "Depot" d WHERE d.id = v."depotId";

ALTER TABLE "Vehicle" ALTER COLUMN "tenantId" SET NOT NULL;

-- Swap the global unique index for a per-tenant one.
DROP INDEX "Vehicle_plate_key";
CREATE UNIQUE INDEX "Vehicle_tenantId_plate_key" ON "Vehicle"("tenantId", "plate");

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;