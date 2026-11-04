"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { authorize } from "@/lib/authorize";
import { diffRecords } from "@/lib/audit/diff";
import { writeAudit } from "@/lib/audit/write";
import { Prisma } from "@prisma/client";

const driverSchema = z.object({
  depotId: z.string().min(1, "Depot ID is required"),
  fullName: z.string().min(1, "fullName is required"),
  licenseUntil: z.coerce.date(),
});

function driverSnapshot(d: { fullName: string; licenseUntil: Date }, depotName: string) {
  return { depot: depotName, fullName: d.fullName, licenseUntil: d.licenseUntil };
}

export const createDriver = async (
  prevState: { error: string | null; success: boolean },
  data: FormData,
) => {
  const checkAuth = await authorize("drivers", "create");
  if (!checkAuth.ok) return { error: checkAuth.error, success: false };
  const { t, tenantId, userId, email } = checkAuth;

  const depotId = data.get("depotId") as string;
  const fullName = data.get("fullName") as string;
  const licenseUntilRaw = data.get("licenseUntil") as string;
  const licenseUntil = licenseUntilRaw ? new Date(licenseUntilRaw) : undefined;

  const validationResult = driverSchema.safeParse({ depotId, fullName, licenseUntil });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.issues.map((err) => err.message).join(", ");
    return { error: t("validationFailed", { message: errorMessages }), success: false };
  }

  const depot = await prisma.depot.findFirst({
    where: { id: validationResult.data.depotId, tenantId },
  });

  if (!depot) {
    return { error: t("depotNotFound"), success: false };
  }

  await prisma.$transaction(async (tx) => {
    const created = await tx.driver.create({
      data: {
        depotId: validationResult.data.depotId,
        fullName: validationResult.data.fullName,
        licenseUntil: validationResult.data.licenseUntil,
      },
    });

    await writeAudit(tx, {
      tenantId,
      actor: { id: userId, email },
      action: "CREATE",
      resource: "drivers",
      resourceId: created.id,
      resourceLabel: created.fullName,
      changes: diffRecords({}, driverSnapshot(created, depot.name)),
    });
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/drivers`);

  return { error: null, success: true };
};

export const updateDriver = async (
  driverId: string,
  prevState: { error: string | null; success: boolean },
  data: FormData,
) => {
  const checkAuth = await authorize("drivers", "update");
  if (!checkAuth.ok) return { error: checkAuth.error, success: false };
  const { t, tenantId, userId, email } = checkAuth;

  const depotId = data.get("depotId") as string;
  const fullName = data.get("fullName") as string;
  const licenseUntilRaw = data.get("licenseUntil") as string;
  const licenseUntil = licenseUntilRaw ? new Date(licenseUntilRaw) : undefined;

  const validationResult = driverSchema.safeParse({ depotId, fullName, licenseUntil });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.issues.map((err) => err.message).join(", ");
    return { error: t("validationFailed", { message: errorMessages }), success: false };
  }

  const depot = await prisma.depot.findFirst({
    where: { id: validationResult?.data?.depotId, tenantId },
  });

  if (!depot) {
    return { error: t("depotNotFound"), success: false };
  }

  // Tenant-scoped read: also closes the IDOR where any driver id could be updated.
  const before = await prisma.driver.findFirst({
    where: { id: driverId, depot: { tenantId } },
    include: { depot: { select: { name: true } } },
  });
  if (!before) {
    return { error: t("driverNotFound"), success: false };
  }

  await prisma.$transaction(async (tx) => {
    const after = await tx.driver.update({
      where: { id: driverId },
      data: {
        depotId: validationResult.data.depotId,
        fullName: validationResult.data.fullName,
        licenseUntil: validationResult.data.licenseUntil,
      },
    });

    await writeAudit(tx, {
      tenantId,
      actor: { id: userId, email },
      action: "UPDATE",
      resource: "drivers",
      resourceId: driverId,
      resourceLabel: after.fullName,
      changes: diffRecords(
        driverSnapshot(before, before.depot.name),
        driverSnapshot(after, depot.name),
      ),
    });
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/drivers`);

  return { error: null, success: true };
};

export const deleteDriver = async (
  driverId: string,
  prevState: { error: string | null; success: boolean },
) => {
  const checkAuth = await authorize("drivers", "delete");
  if (!checkAuth.ok) return { error: checkAuth.error, success: false };
  const { t, tenantId, userId, email } = checkAuth;

  const before = await prisma.driver.findFirst({
    where: { id: driverId, depot: { tenantId } },
    include: { depot: { select: { name: true } } },
  });
  if (!before) {
    return { error: t("driverNotFound"), success: false };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.driver.delete({ where: { id: driverId } });

      await writeAudit(tx, {
        tenantId,
        actor: { id: userId, email },
        action: "DELETE",
        resource: "drivers",
        resourceId: driverId,
        resourceLabel: before.fullName,
        changes: diffRecords(driverSnapshot(before, before.depot.name), {}),
      });
    });
  } catch (err) {
    // P2003 = foreign key violation (the driver still has dispatches).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return { error: t("driverRelation"), success: false };
    }
    throw err;
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/drivers`);

  return { error: null, success: true };
};
