/*
  Warnings:

  - A unique constraint covering the columns `[plate]` on the table `Vehicle` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");
