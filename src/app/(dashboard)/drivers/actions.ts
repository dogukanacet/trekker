"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";

const driverSchema = z.object({
  depotId: z.string().min(1, "Depot ID is required"),
  fullName: z.string().min(1, "fullName is required"),
  licenseUntil: z.coerce.date(),
});

export const createDriver = async (data: FormData) => {
  const session = await auth();
  if (!session) {
    throw new Error("User is not authenticated");
  }

  const depotId = data.get("depotId") as string;
  const fullName = data.get("fullName") as string;

  const licenseUntilRaw = data.get("licenseUntil") as string;
  const licenseUntil = licenseUntilRaw ? new Date(licenseUntilRaw) : undefined;

  const validationResult = driverSchema.safeParse({
    depotId,
    fullName,
    licenseUntil,
  });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    throw new Error(`Validation failed: ${errorMessages}`);
  }

  const depot = await prisma.depot.findFirst({
    where: { id: validationResult?.data?.depotId, tenantId: session?.user?.tenantId },
  });

  if (!depot) {
    throw new Error("Depot not found or does not belong to the user's tenant");
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
  const session = await auth();
  if (!session) {
    throw new Error("User is not authenticated");
  }

  const depotId = data.get("depotId") as string;
  const fullName = data.get("fullName") as string;
  const licenseUntilRaw = data.get("licenseUntil") as string;
  const licenseUntil = licenseUntilRaw ? new Date(licenseUntilRaw) : undefined;

  const validationResult = driverSchema.safeParse({
    depotId,
    fullName,
    licenseUntil,
  });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    return { error: `Validation failed: ${errorMessages}` };
  }

  const depot = await prisma.depot.findFirst({
    where: { id: validationResult?.data?.depotId, tenantId: session?.user?.tenantId },
  });

  if (!depot) {
    throw new Error("Depot not found or does not belong to the user's tenant");
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
  const session = await auth();
  if (!session) {
    throw new Error("User is not authenticated");
  }
  await prisma.driver.deleteMany({
    where: { id: driverId, depot: { tenantId: session?.user?.tenantId } },
  });
  revalidatePath("/drivers");
};
