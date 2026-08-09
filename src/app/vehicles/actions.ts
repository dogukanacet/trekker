"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const vehicleSchema = z.object({
  depotId: z.string().min(1, "Depot ID is required"),
  plate: z.string().min(1, "Plate is required"),
  model: z.string().optional(),
  insuranceUntil: z.coerce.date().optional(),
  inspectionUntil: z.coerce.date().optional(),
});

export const createVehicle = async (data: FormData) => {
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

export const updateVehicle = async (vehicleId: string, data: FormData) => {
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
};

export const deleteVehicle = async (vehicleId: string) => {
  await prisma.vehicle.delete({
    where: { id: vehicleId },
  });
  revalidatePath("/vehicles");
};
