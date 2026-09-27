-- CreateTable
CREATE TABLE "DispatchStatusHistory" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "status" "DispatchStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispatchStatusHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DispatchStatusHistory" ADD CONSTRAINT "DispatchStatusHistory_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "Dispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
