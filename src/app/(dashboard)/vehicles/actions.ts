"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";

const vehicleSchema = z.object({
  depotId: z.string().min(1, "Depot ID is required"),
  plate: z.string().min(1, "Plate is required"),
  model: z.string().optional(),
  insuranceUntil: z.coerce.date().optional(),
  inspectionUntil: z.coerce.date().optional(),
});

export const createVehicle = async (data: FormData) => {
  const session = await auth();
  if (!session) {
    throw new Error("User is not authenticated");
  }

  const depotId = data.get("depotId") as string;
  const plate = data.get("plate") as string;
  const model = data.get("model") as string;

  const insuranceUntilRaw = data.get("insuranceUntil") as string;
  const inspectionUntilRaw = data.get("inspectionUntil") as string;
  const insuranceUntil = insuranceUntilRaw ? new Date(insuranceUntilRaw) : undefined;
  const inspectionUntil = inspectionUntilRaw ? new Date(inspectionUntilRaw) : undefined;

  const validationResult = vehicleSchema.safeParse({
    depotId,
    plate,
    model,
    insuranceUntil,
    inspectionUntil,
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

  await prisma.vehicle.create({
    data: {
      depotId: validationResult.data.depotId,
      plate: validationResult.data.plate,
      model: validationResult.data.model,
      insuranceUntil: validationResult.data.insuranceUntil,
      inspectionUntil: validationResult.data.inspectionUntil,
    },
  });
  revalidatePath("/vehicles");
};

export const updateVehicle = async (
  vehicleId: string,
  prevState: { error: string | null },
  data: FormData,
) => {
  const session = await auth();
  if (!session) {
    throw new Error("User is not authenticated");
  }

  const depotId = data.get("depotId") as string;
  const plate = data.get("plate") as string;
  const model = data.get("model") as string;

  const insuranceUntilRaw = data.get("insuranceUntil") as string;
  const inspectionUntilRaw = data.get("inspectionUntil") as string;
  const insuranceUntil = insuranceUntilRaw ? new Date(insuranceUntilRaw) : undefined;
  const inspectionUntil = inspectionUntilRaw ? new Date(inspectionUntilRaw) : undefined;

  const validationResult = vehicleSchema.safeParse({
    depotId,
    plate,
    model,
    insuranceUntil,
    inspectionUntil,
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

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      depotId: validationResult.data.depotId,
      plate: validationResult.data.plate,
      model: validationResult.data.model,
      insuranceUntil: validationResult.data.insuranceUntil,
      inspectionUntil: validationResult.data.inspectionUntil,
    },
  });
  revalidatePath("/vehicles");
  return { error: null };
};

export const deleteVehicle = async (vehicleId: string) => {
  const session = await auth();
  if (!session) {
    throw new Error("User is not authenticated");
  }

  await prisma.vehicle.deleteMany({
    where: { id: vehicleId, depot: { tenantId: session?.user?.tenantId } },
  });
  revalidatePath("/vehicles");
};
