"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { DispatchStatus } from "@prisma/client";

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
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!session || !tenantId) {
    return { error: "User is not authenticated", success: false };
  }

  const routeId = data.get("routeId") as string;
  const driverId = data.get("driverId") as string;
  const vehicleId = data.get("vehicleId") as string;

  const validationResult = dispatchCreateSchema.safeParse({ routeId, vehicleId, driverId });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    return { error: `Validation failed: ${errorMessages}`, success: false };
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
      error: "Araç, sürücü veya rota bulunamadı ya da bu firmaya ait değil",
      success: false,
    };
  }

  await prisma.dispatch.create({
    data: {
      routeId: validationResult.data.routeId,
      vehicleId: validationResult.data.vehicleId,
      driverId: validationResult.data.driverId,
    },
  });
  revalidatePath("/dispatches");

  return { error: null, success: true };
};

export const updateDispatch = async (
  dispatchId: string,
  prevState: { error: string | null; success: boolean },
  data: FormData,
) => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!session || !tenantId) {
    return { error: "User is not authenticated", success: false };
  }

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
    return { error: `Validation failed: ${errorMessages}`, success: false };
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
      error: "Araç, sürücü veya rota bulunamadı ya da bu firmaya ait değil",
      success: false,
    };
  }

  const result = await prisma.dispatch.updateMany({
    where: { id: dispatchId, vehicle: { depot: { tenantId } } },
    data: {
      routeId: validationResult.data.routeId,
      driverId: validationResult.data.driverId,
      vehicleId: validationResult.data.vehicleId,
      status: validationResult.data.status,
    },
  });

  if (result.count === 0) {
    return { error: "Sevkiyat bulunamadı", success: false };
  }

  revalidatePath("/dispatches");
  return { error: null, success: true };
};

export const deleteDispatch = async (
  dispatchId: string,
  prevState: { error: string | null; success: boolean },
) => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!session || !tenantId) {
    return { error: "User is not authenticated", success: false };
  }

  const result = await prisma.dispatch.deleteMany({
    where: { id: dispatchId, vehicle: { depot: { tenantId } } },
  });

  if (result.count === 0) {
    return { error: "Sevkiyat bulunamadı", success: false };
  }

  revalidatePath("/dispatches");
  return { error: null, success: true };
};
