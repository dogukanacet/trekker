"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { authorize } from "@/lib/authorize";

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
  const checkAuth = await authorize("routes", "create");
  if (!checkAuth.ok) return { error: checkAuth.error };
  const { t, tenantId } = checkAuth;

  const label = data.get("label") as string;
  const lat = data.get("lat") as string;
  const lng = data.get("lng") as string;
  const validationResult = stopSchema.safeParse({ routeId, label, lat, lng });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    return { error: t("validationFailed", { message: errorMessages }) };
  }

  const route = await prisma.route.findFirst({
    where: { id: routeId, depot: { tenantId } },
    select: { id: true },
  });

  if (!route) {
    return { error: t("routeNotFound") };
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
  const locale = await getLocale();
  revalidatePath(`/${locale}/routes/${routeId}`);

  return { error: null };
};

export const deleteStop = async (
  stopId: string,
  routeId: string,
  prevState: { error: string | null },
) => {
  const checkAuth = await authorize("routes", "delete");
  if (!checkAuth.ok) return { error: checkAuth.error };
  const { tenantId } = checkAuth;

  await prisma.routeStop.deleteMany({
    where: { id: stopId, route: { depot: { tenantId } } },
  });
  const locale = await getLocale();
  revalidatePath(`/${locale}/routes/${routeId}`);

  return { error: null };
};
