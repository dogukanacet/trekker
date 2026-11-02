"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { DispatchStatus } from "@prisma/client";
import { authorize } from "@/lib/authorize";
import { NEXT_DISPATCH_STATUS } from "@/lib/dispatch-status";
import { diffRecords } from "@/lib/audit/diff";
import { writeAudit } from "@/lib/audit/write";

const dispatchCreateSchema = z.object({
  routeId: z.string().min(1, "Route ID is required"),
  driverId: z.string().min(1, "Driver ID is required"),
  vehicleId: z.string().min(1, "Vehicle ID is required"),
});

const dispatchUpdateSchema = z.object({
  routeId: z.string().min(1, "Route ID is required"),
  driverId: z.string().min(1, "Driver ID is required"),
  vehicleId: z.string().min(1, "Vehicle ID is required"),
  status: z.nativeEnum(DispatchStatus),
});

// Dispatches have no name of their own, so the log label is route + plate.
const dispatchLabel = (routeName: string, plate: string) => `${routeName} · ${plate}`;

export const createDispatch = async (
  prevState: { error: string | null; success: boolean },
  data: FormData,
) => {
  const checkAuth = await authorize("dispatches", "create");
  if (!checkAuth.ok) return { error: checkAuth.error, success: false };
  const { t, tenantId, userId, email } = checkAuth;

  const routeId = data.get("routeId") as string;
  const driverId = data.get("driverId") as string;
  const vehicleId = data.get("vehicleId") as string;

  const validationResult = dispatchCreateSchema.safeParse({ routeId, vehicleId, driverId });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    return { error: t("validationFailed", { message: errorMessages }), success: false };
  }

  const [vehicle, driver, route] = await Promise.all([
    prisma.vehicle.findFirst({
      where: { id: validationResult.data.vehicleId, depot: { tenantId } },
    }),
    prisma.driver.findFirst({
      where: { id: validationResult.data.driverId, depot: { tenantId } },
    }),
    prisma.route.findFirst({
      where: { id: validationResult.data.routeId, depot: { tenantId } },
    }),
  ]);

  if (!vehicle || !driver || !route) {
    return {
      error: t("resourceNotFound"),
      success: false,
    };
  }

  await prisma.$transaction(async (tx) => {
    const dispatch = await tx.dispatch.create({
      data: {
        routeId: validationResult.data.routeId,
        vehicleId: validationResult.data.vehicleId,
        driverId: validationResult.data.driverId,
      },
    });

    // Dispatches are always created with PLANNED status (the schema's @default) —
    // create the first history entry here with that status as well.
    await tx.dispatchStatusHistory.create({
      data: { dispatchId: dispatch.id, status: dispatch.status },
    });

    await writeAudit(tx, {
      tenantId,
      actor: { id: userId, email },
      action: "CREATE",
      resource: "dispatches",
      resourceId: dispatch.id,
      resourceLabel: dispatchLabel(route.name, vehicle.plate),
      changes: diffRecords(
        {},
        {
          status: dispatch.status,
          route: route.name,
          vehicle: vehicle.plate,
          driver: driver.fullName,
        },
      ),
    });
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/dispatches`);

  return { error: null, success: true };
};

export const updateDispatch = async (
  dispatchId: string,
  prevState: { error: string | null; success: boolean },
  data: FormData,
) => {
  const checkAuth = await authorize("dispatches", "update");
  if (!checkAuth.ok) return { error: checkAuth.error, success: false };
  const { t, tenantId, userId, email } = checkAuth;

  const routeId = data.get("routeId") as string;
  const driverId = data.get("driverId") as string;
  const vehicleId = data.get("vehicleId") as string;
  const status = data.get("status") as string;

  const validationResult = dispatchUpdateSchema.safeParse({
    routeId,
    driverId,
    vehicleId,
    status,
  });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    return { error: t("validationFailed", { message: errorMessages }), success: false };
  }

  const [vehicle, driver, route, currentDispatch] = await Promise.all([
    prisma.vehicle.findFirst({
      where: { id: validationResult.data.vehicleId, depot: { tenantId } },
    }),
    prisma.driver.findFirst({
      where: { id: validationResult.data.driverId, depot: { tenantId } },
    }),
    prisma.route.findFirst({
      where: { id: validationResult.data.routeId, depot: { tenantId } },
    }),
    prisma.dispatch.findFirst({
      where: { id: dispatchId, vehicle: { depot: { tenantId } } },
      include: {
        route: { select: { name: true } },
        vehicle: { select: { plate: true } },
        driver: { select: { fullName: true } },
      },
    }),
  ]);

  if (!vehicle || !driver || !route || !currentDispatch) {
    return {
      error: t("resourceNotFound"),
      success: false,
    };
  }

  const statusChanged = currentDispatch.status !== validationResult.data.status;

  const changes = diffRecords(
    {
      status: currentDispatch.status,
      route: currentDispatch.route.name,
      vehicle: currentDispatch.vehicle.plate,
      driver: currentDispatch.driver.fullName,
    },
    {
      status: validationResult.data.status,
      route: route.name,
      vehicle: vehicle.plate,
      driver: driver.fullName,
    },
  );
  // A save that only moved the status is logged as STATUS_CHANGE, anything else as UPDATE.
  const onlyStatus = changes !== null && Object.keys(changes).length === 1 && "status" in changes;

  await prisma.$transaction(async (tx) => {
    await tx.dispatch.update({
      where: { id: dispatchId },
      data: {
        routeId: validationResult.data.routeId,
        driverId: validationResult.data.driverId,
        vehicleId: validationResult.data.vehicleId,
        status: validationResult.data.status,
      },
    });

    if (statusChanged) {
      await tx.dispatchStatusHistory.create({
        data: { dispatchId, status: validationResult.data.status },
      });
    }

    await writeAudit(tx, {
      tenantId,
      actor: { id: userId, email },
      action: onlyStatus ? "STATUS_CHANGE" : "UPDATE",
      resource: "dispatches",
      resourceId: dispatchId,
      resourceLabel: dispatchLabel(route.name, vehicle.plate),
      changes,
    });
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/dispatches`);

  return { error: null, success: true };
};

export const deleteDispatch = async (
  dispatchId: string,
  prevState: { error: string | null; success: boolean },
) => {
  const checkAuth = await authorize("dispatches", "delete");
  if (!checkAuth.ok) return { error: checkAuth.error, success: false };
  const { t, tenantId, userId, email } = checkAuth;

  const before = await prisma.dispatch.findFirst({
    where: { id: dispatchId, vehicle: { depot: { tenantId } } },
    include: {
      route: { select: { name: true } },
      vehicle: { select: { plate: true } },
      driver: { select: { fullName: true } },
    },
  });
  if (!before) {
    return { error: t("dispatchNotFound"), success: false };
  }

  await prisma.$transaction(async (tx) => {
    await tx.dispatch.delete({ where: { id: dispatchId } });

    await writeAudit(tx, {
      tenantId,
      actor: { id: userId, email },
      action: "DELETE",
      resource: "dispatches",
      resourceId: dispatchId,
      resourceLabel: dispatchLabel(before.route.name, before.vehicle.plate),
      changes: diffRecords(
        {
          status: before.status,
          route: before.route.name,
          vehicle: before.vehicle.plate,
          driver: before.driver.fullName,
        },
        {},
      ),
    });
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/dispatches`);

  return { error: null, success: true };
};

export async function getDispatchDetail(dispatchId: string) {
  const checkAuth = await authorize("dispatches", "read");
  if (!checkAuth.ok) return { error: checkAuth.error, dispatch: null, history: [] };
  const { t, tenantId, role, driverId } = checkAuth;

  const dispatch = await prisma.dispatch.findFirst({
    where: {
      id: dispatchId,
      vehicle: { depot: { tenantId } },
      ...(role === "DRIVER" ? { driverId: driverId ?? "" } : {}),
    },
  });

  if (!dispatch) {
    return { error: t("dispatchNotFound"), dispatch: null, history: [] };
  }

  const history = await prisma.dispatchStatusHistory.findMany({
    where: { dispatchId },
    orderBy: { changedAt: "asc" },
  });

  return { error: null, dispatch, history };
}

export const advanceDispatchStatus = async (
  dispatchId: string,
  expectedStatus: DispatchStatus,
  prevState: { error: string | null; success: boolean },
) => {
  const checkAuth = await authorize("dispatches", "changeStatus");
  if (!checkAuth.ok) return { error: checkAuth.error, success: false };
  const { t, tenantId, userId, email, role, driverId } = checkAuth;

  // The client only reports the status it saw; the target status is always derived on the server.
  const parsedStatus = z.nativeEnum(DispatchStatus).safeParse(expectedStatus);
  const nextStatus = parsedStatus.success ? NEXT_DISPATCH_STATUS[parsedStatus.data] : undefined;
  if (!parsedStatus.success || !nextStatus) {
    return { error: t("invalidStatusTransition"), success: false };
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Compare-and-swap: only updates if the dispatch still has the status the user saw,
    // belongs to this tenant and (for drivers) to the driver themselves.
    const result = await tx.dispatch.updateMany({
      where: {
        id: dispatchId,
        status: parsedStatus.data,
        vehicle: { depot: { tenantId } },
        // An empty string never matches, so a driver without a linked Driver record updates nothing.
        ...(role === "DRIVER" ? { driverId: driverId ?? "" } : {}),
      },
      data: { status: nextStatus },
    });
    if (result.count === 0) return false;

    await tx.dispatchStatusHistory.create({ data: { dispatchId, status: nextStatus } });
    const info = await tx.dispatch.findUnique({
      where: { id: dispatchId },
      select: { route: { select: { name: true } }, vehicle: { select: { plate: true } } },
    });

    await writeAudit(tx, {
      tenantId,
      actor: { id: userId, email },
      action: "STATUS_CHANGE",
      resource: "dispatches",
      resourceId: dispatchId,
      resourceLabel: info ? dispatchLabel(info.route.name, info.vehicle.plate) : undefined,
      changes: { status: { from: parsedStatus.data, to: nextStatus } },
    });
    return true;
  });

  if (!updated) {
    return { error: t("dispatchStatusConflict"), success: false };
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/dispatches`);
  revalidatePath(`/${locale}`);

  return { error: null, success: true };
};
