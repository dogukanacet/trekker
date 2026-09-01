"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";

const routeSchema = z.object({
  depotId: z.string().min(1, "Depot ID is required"),
  name: z.string().min(1, "Name is required"),
});

const stopSchema = z.object({
  routeId: z.string().min(1, "routeId ID is required"),
  label: z.string().min(1, "Label is required"),
  lat: z.coerce.number().min(1, "Lat is required"),
  lng: z.coerce.number().min(1, "Lng is required"),
});

export const createRoute = async (
  prevState: { error: string | null; success: boolean },
  data: FormData,
) => {
  const session = await auth();
  if (!session) {
    return { error: "User is not authenticated", success: false };
  }

  const depotId = data.get("depotId") as string;
  const name = data.get("name") as string;
  const validationResult = routeSchema.safeParse({ depotId, name });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    return { error: `Validation failed: ${errorMessages}`, success: false };
  }

  const depot = await prisma.depot.findFirst({
    where: { id: validationResult.data.depotId, tenantId: session?.user?.tenantId },
  });

  if (!depot) {
    return { error: "Depot not found or does not belong to the user's tenant", success: false };
  }

  await prisma.route.create({
    data: {
      depotId: validationResult.data.depotId,
      name: validationResult.data.name,
    },
  });
  revalidatePath("/routes");

  return { error: null, success: true };
};

export const updateRoute = async (
  routeId: string,
  prevState: { error: string | null; success: boolean },
  data: FormData,
) => {
  const session = await auth();
  if (!session) {
    return { error: "User is not authenticated", success: false };
  }

  const depotId = data.get("depotId") as string;
  const name = data.get("name") as string;

  const validationResult = routeSchema.safeParse({
    depotId,
    name,
  });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    return { error: `Validation failed: ${errorMessages}`, success: false };
  }

  const depot = await prisma.depot.findFirst({
    where: { id: validationResult?.data?.depotId, tenantId: session?.user?.tenantId },
  });

  if (!depot) {
    return { error: "Depot not found or does not belong to the user's tenant", success: false };
  }

  await prisma.route.update({
    where: { id: routeId },
    data: {
      depotId: validationResult.data.depotId,
      name: validationResult.data.name,
    },
  });
  revalidatePath("/routes");

  return { error: null, success: true };
};

export const deleteRoute = async (
  routeId: string,
  prevState: { error: string | null; success: boolean },
) => {
  const session = await auth();
  if (!session) {
    return { error: "User is not authenticated", success: false };
  }

  try {
    const result = await prisma.route.deleteMany({
      where: { id: routeId, depot: { tenantId: session?.user?.tenantId } },
    });

    if (result.count === 0) {
      return { error: "Rota bulunamadı", success: false };
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("foreign key constraint")) {
      return {
        error: "Bu rota geçmiş veya aktif sevkiyatlarla ilişkili olduğu için silinemez.",
        success: false,
      };
    }
    throw err;
  }

  revalidatePath("/routes");
  return { error: null, success: true };
};

export const addStop = async (routeId: string, data: FormData) => {
  const session = await auth();
  if (!session) {
    return { error: "User is not authenticated" };
  }

  const label = data.get("label") as string;
  const lat = data.get("lat") as string;
  const lng = data.get("lng") as string;
  const validationResult = stopSchema.safeParse({
    routeId,
    label,
    lat,
    lng,
  });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    return { error: `Validation failed: ${errorMessages}` };
  }

  const stopCount = await prisma.routeStop.count({ where: { routeId } });

  await prisma.routeStop.create({
    data: {
      routeId: validationResult.data.routeId,
      label: validationResult.data.label,
      lat: validationResult.data.lat,
      lng: validationResult.data.lng,
      order: stopCount + 1,
    },
  });
  revalidatePath(`/routes/${routeId}`);
};

export const deleteStop = async (stopId: string, routeId: string) => {
  const session = await auth();
  if (!session) {
    return { error: "User is not authenticated" };
  }

  await prisma.routeStop.deleteMany({
    where: { id: stopId, route: { depot: { tenantId: session.user?.tenantId } } },
  });
  revalidatePath(`/routes/${routeId}`);
};
