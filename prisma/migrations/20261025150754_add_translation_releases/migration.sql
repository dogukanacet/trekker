-- CreateEnum
CREATE TYPE "ReleaseKind" AS ENUM ('PUBLISH', 'REVERT');

-- CreateTable
CREATE TABLE "TranslationRelease" (
    "id" TEXT NOT NULL,
    "kind" "ReleaseKind" NOT NULL DEFAULT 'PUBLISH',
    "revertsReleaseId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranslationRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranslationReleaseItem" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,

    CONSTRAINT "TranslationReleaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TranslationRelease_createdAt_idx" ON "TranslationRelease"("createdAt");

-- CreateIndex
CREATE INDEX "TranslationReleaseItem_releaseId_idx" ON "TranslationReleaseItem"("releaseId");

-- AddForeignKey
ALTER TABLE "TranslationRelease" ADD CONSTRAINT "TranslationRelease_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationReleaseItem" ADD CONSTRAINT "TranslationReleaseItem_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "TranslationRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
