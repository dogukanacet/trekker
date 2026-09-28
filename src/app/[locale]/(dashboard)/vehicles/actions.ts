"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { authorize } from "@/lib/authorize";

const vehicleSchema = z.object({
  depotId: z.string().min(1, "Depot ID is required"),
  plate: z.string().min(1, "Plate is required"),
  model: z.string().optional(),
  insuranceUntil: z.coerce.date().optional(),
  inspectionUntil: z.coerce.date().optional(),
});

export const createVehicle = async (
  prevState: { error: string | null; success: boolean },
  data: FormData,
) => {
  const checkAuth = await authorize("vehicles", "create");
  if (!checkAuth.ok) return { error: checkAuth.error, success: false };
  const { t, tenantId } = checkAuth;

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
    return { error: t("validationFailed", { message: errorMessages }), success: false };
  }

  const depot = await prisma.depot.findFirst({
    where: { id: validationResult.data.depotId, tenantId },
  });

  if (!depot) {
    return { error: t("depotNotFound"), success: false };
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
  const locale = await getLocale();
  revalidatePath(`/${locale}/vehicles`);

  return { error: null, success: true };
};

export const updateVehicle = async (
  vehicleId: string,
  prevState: { error: string | null; success: boolean },
  data: FormData,
) => {
  const checkAuth = await authorize("vehicles", "update");
  if (!checkAuth.ok) return { error: checkAuth.error, success: false };
  const { t, tenantId } = checkAuth;

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
    return { error: t("validationFailed", { message: errorMessages }), success: false };
  }

  const depot = await prisma.depot.findFirst({
    where: { id: validationResult?.data?.depotId, tenantId },
  });

  if (!depot) {
    return { error: t("depotNotFound"), success: false };
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
  const locale = await getLocale();
  revalidatePath(`/${locale}/vehicles`);

  return { error: null, success: true };
};

export const deleteVehicle = async (
  vehicleId: string,
  prevState: { error: string | null; success: boolean },
) => {
  const checkAuth = await authorize("vehicles", "delete");
  if (!checkAuth.ok) return { error: checkAuth.error, success: false };
  const { t, tenantId } = checkAuth;

  try {
    const result = await prisma.vehicle.deleteMany({
      where: { id: vehicleId, depot: { tenantId } },
    });

    if (result.count === 0) {
      return { error: t("vehicleNotFound"), success: false };
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("foreign key constraint")) {
      return {
        error: t("vehicleRelation"),
        success: false,
      };
    }
    throw err;
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/vehicles`);

  return { error: null, success: true };
};
