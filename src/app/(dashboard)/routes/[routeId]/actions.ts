"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";

const stopSchema = z.object({
  routeId: z.string().min(1, "routeId ID is required"),
  label: z.string().min(1, "Label is required"),
  lat: z.coerce.number().min(1, "Lat is required"),
  lng: z.coerce.number().min(1, "Lng is required"),
});

export const addStop = async (
  routeId: string,
  prevState: { error: string | null },
  data: FormData,
) => {
  const session = await auth();
  if (!session) {
    return { error: "User is not authenticated" };
  }

  const label = data.get("label") as string;
  const lat = data.get("lat") as string;
  const lng = data.get("lng") as string;
  const validationResult = stopSchema.safeParse({ routeId, label, lat, lng });

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

  return { error: null };
};

export const deleteStop = async (
  stopId: string,
  routeId: string,
  prevState: { error: string | null },
) => {
  const session = await auth();
  if (!session) {
    return { error: "User is not authenticated" };
  }

  await prisma.routeStop.deleteMany({
    where: { id: stopId, route: { depot: { tenantId: session.user?.tenantId } } },
  });
  revalidatePath(`/routes/${routeId}`);

  return { error: null };
};
