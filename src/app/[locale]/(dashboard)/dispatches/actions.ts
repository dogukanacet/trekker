"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { DispatchStatus } from "@prisma/client";
import { authorize } from "@/lib/authorize";

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

export const createDispatch = async (
  prevState: { error: string | null; success: boolean },
  data: FormData,
) => {
  const checkAuth = await authorize("dispatches", "create");
  if (!checkAuth.ok) return { error: checkAuth.error, success: false };
  const { t, tenantId } = checkAuth;

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

  const dispatch = await prisma.dispatch.create({
    data: {
      routeId: validationResult.data.routeId,
      vehicleId: validationResult.data.vehicleId,
      driverId: validationResult.data.driverId,
    },
  });

  // Dispatch her zaman PLANNED durumuyla oluşuyor (şemadaki @default) —
  // geçmişin ilk kaydını da burada, o durumla düşüyoruz.
  await prisma.dispatchStatusHistory.create({
    data: { dispatchId: dispatch.id, status: dispatch.status },
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
  const { t, tenantId } = checkAuth;

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
    }),
  ]);

  if (!vehicle || !driver || !route || !currentDispatch) {
    return {
      error: t("resourceNotFound"),
      success: false,
    };
  }

  const statusChanged = currentDispatch.status !== validationResult.data.status;

  await prisma.$transaction([
    prisma.dispatch.update({
      where: { id: dispatchId },
      data: {
        routeId: validationResult.data.routeId,
        driverId: validationResult.data.driverId,
        vehicleId: validationResult.data.vehicleId,
        status: validationResult.data.status,
      },
    }),
    ...(statusChanged
      ? [
          prisma.dispatchStatusHistory.create({
            data: { dispatchId, status: validationResult.data.status },
          }),
        ]
      : []),
  ]);

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
  const { t, tenantId } = checkAuth;

  const result = await prisma.dispatch.deleteMany({
    where: { id: dispatchId, vehicle: { depot: { tenantId } } },
  });

  if (result.count === 0) {
    return { error: t("dispatchNotFound"), success: false };
  }

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
