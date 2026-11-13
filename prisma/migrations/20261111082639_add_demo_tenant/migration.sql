-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Tenant_isDemo_expiresAt_idx" ON "Tenant"("isDemo", "expiresAt");
