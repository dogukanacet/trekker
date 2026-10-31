"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { authorize } from "@/lib/authorize";
import { diffRecords } from "@/lib/audit/diff";
import { writeAudit } from "@/lib/audit/write";

const vehicleSchema = z.object({
  depotId: z.string().min(1, "Depot ID is required"),
  plate: z.string().min(1, "Plate is required"),
  model: z.string().optional(),
  insuranceUntil: z.coerce.date().optional(),
  inspectionUntil: z.coerce.date().optional(),
});

// Only the fields worth showing in the audit log (no ids of children, no createdAt).
function vehicleSnapshot(v: {
  depotId: string;
  plate: string;
  model: string | null;
  insuranceUntil: Date | null;
  inspectionUntil: Date | null;
}) {
  return {
    depotId: v.depotId,
    plate: v.plate,
    model: v.model,
    insuranceUntil: v.insuranceUntil,
    inspectionUntil: v.inspectionUntil,
  };
}

export const createVehicle = async (
  prevState: { error: string | null; success: boolean },
  data: FormData,
) => {
  const checkAuth = await authorize("vehicles", "create");
  if (!checkAuth.ok) return { error: checkAuth.error, success: false };
  const { t, tenantId, userId, email } = checkAuth;

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

  await prisma.$transaction(async (tx) => {
    const created = await tx.vehicle.create({
      data: {
        depotId: validationResult.data.depotId,
        plate: validationResult.data.plate,
        model: validationResult.data.model,
        insuranceUntil: validationResult.data.insuranceUntil,
        inspectionUntil: validationResult.data.inspectionUntil,
      },
    });

    await writeAudit(tx, {
      tenantId,
      actor: { id: userId, email },
      action: "CREATE",
      resource: "vehicles",
      resourceId: created.id,
      resourceLabel: created.plate,
      changes: diffRecords({}, vehicleSnapshot(created)),
    });
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
  const { t, tenantId, userId, email } = checkAuth;

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

  // Tenant-scoped read: also closes the IDOR where any vehicle id could be updated.
  const before = await prisma.vehicle.findFirst({
    where: { id: vehicleId, depot: { tenantId } },
  });

  if (!before) {
    return { error: t("vehicleNotFound"), success: false };
  }

  await prisma.$transaction(async (tx) => {
    const after = await tx.vehicle.update({
      where: { id: vehicleId },
      data: {
        depotId: validationResult.data.depotId,
        plate: validationResult.data.plate,
        model: validationResult.data.model,
        insuranceUntil: validationResult.data.insuranceUntil,
        inspectionUntil: validationResult.data.inspectionUntil,
      },
    });

    await writeAudit(tx, {
      tenantId,
      actor: { id: userId, email },
      action: "UPDATE",
      resource: "vehicles",
      resourceId: vehicleId,
      resourceLabel: after.plate,
      changes: diffRecords(vehicleSnapshot(before), vehicleSnapshot(after)),
    });
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
  const { t, tenantId, userId, email } = checkAuth;

  // Read first: the log needs the plate and last known values after the row is gone.
  const before = await prisma.vehicle.findFirst({
    where: { id: vehicleId, depot: { tenantId } },
  });

  if (!before) {
    return { error: t("vehicleNotFound"), success: false };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.vehicle.delete({ where: { id: vehicleId } });

      await writeAudit(tx, {
        tenantId,
        actor: { id: userId, email },
        action: "DELETE",
        resource: "vehicles",
        resourceId: vehicleId,
        resourceLabel: before.plate,
        changes: diffRecords(vehicleSnapshot(before), {}),
      });
    });
  } catch (err) {
    // P2003 = foreign key violation (the vehicle still has dispatches).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return { error: t("vehicleRelation"), success: false };
    }
    throw err;
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/vehicles`);

  return { error: null, success: true };
};
