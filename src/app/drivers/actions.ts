"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const driverSchema = z.object({
  depotId: z.string().min(1, "Depot ID is required"),
  fullName: z.string().min(1, "fullName is required"),
  licenseUntil: z.coerce.date().optional(),
});

export const createDriver = async (data: FormData) => {
  const depotId = data.get("depotId") as string;
  const fullName = data.get("fullName") as string;

  const licenseUntilRaw = data.get("licenseUntil") as string;
  const createdAtRaw = data.get("createdAt") as string;
  const licenseUntil = licenseUntilRaw ? new Date(licenseUntilRaw) : undefined;
  const createdAt = createdAtRaw ? new Date(createdAtRaw) : undefined;

  const validationResult = driverSchema.safeParse({
    depotId,
    fullName,
    licenseUntil,
    createdAt,
  });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    throw new Error(`Validation failed: ${errorMessages}`);
  }

  await prisma.driver.create({
    data: {
      depotId: validationResult.data.depotId,
      fullName: validationResult.data.fullName,
      licenseUntil: validationResult.data.licenseUntil,
    },
  });
  revalidatePath("/drivers");
};

export const updateDriver = async (
  driverId: string,
  prevState: { error: string | null },
  data: FormData,
) => {
  const depotId = data.get("depotId") as string;
  const fullName = data.get("fullName") as string;
  const licenseUntilRaw = data.get("licenseUntil") as string;
  const createdAtRaw = data.get("createdAt") as string;
  const licenseUntil = licenseUntilRaw ? new Date(licenseUntilRaw) : undefined;
  const createdAt = createdAtRaw ? new Date(createdAtRaw) : undefined;

  const validationResult = driverSchema.safeParse({
    depotId,
    fullName,
    licenseUntil,
    createdAt,
  });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    return { error: `Validation failed: ${errorMessages}` };
  }

  await prisma.driver.update({
    where: { id: driverId },
    data: {
      depotId: validationResult.data.depotId,
      fullName: validationResult.data.fullName,
      licenseUntil: validationResult.data.licenseUntil,
    },
  });
  revalidatePath("/drivers");

  return { error: null };
};

export const deleteDriver = async (driverId: string) => {
  await prisma.driver.delete({
    where: { id: driverId },
  });
  revalidatePath("/drivers");
};
