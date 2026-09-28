"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { authorize } from "@/lib/authorize";

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
  const checkAuth = await authorize("routes", "create");
  if (!checkAuth.ok) return { error: checkAuth.error, success: false };
  const { t, tenantId } = checkAuth;

  const depotId = data.get("depotId") as string;
  const name = data.get("name") as string;
  const validationResult = routeSchema.safeParse({ depotId, name });

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

  await prisma.route.create({
    data: {
      depotId: validationResult.data.depotId,
      name: validationResult.data.name,
    },
  });
  const locale = await getLocale();
  revalidatePath(`/${locale}/routes`);

  return { error: null, success: true };
};

export const updateRoute = async (
  routeId: string,
  prevState: { error: string | null; success: boolean },
  data: FormData,
) => {
  const checkAuth = await authorize("routes", "update");
  if (!checkAuth.ok) return { error: checkAuth.error, success: false };
  const { t, tenantId } = checkAuth;

  const depotId = data.get("depotId") as string;
  const name = data.get("name") as string;

  const validationResult = routeSchema.safeParse({
    depotId,
    name,
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

  await prisma.route.update({
    where: { id: routeId },
    data: {
      depotId: validationResult.data.depotId,
      name: validationResult.data.name,
    },
  });
  const locale = await getLocale();
  revalidatePath(`/${locale}/routes`);

  return { error: null, success: true };
};

export const deleteRoute = async (
  routeId: string,
  prevState: { error: string | null; success: boolean },
) => {
  const checkAuth = await authorize("routes", "delete");
  if (!checkAuth.ok) return { error: checkAuth.error, success: false };
  const { t, tenantId } = checkAuth;

  try {
    const result = await prisma.route.deleteMany({
      where: { id: routeId, depot: { tenantId } },
    });

    if (result.count === 0) {
      return { error: t("routeNotFound"), success: false };
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("foreign key constraint")) {
      return {
        error: t("routeRelation"),
        success: false,
      };
    }
    throw err;
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/routes`);

  return { error: null, success: true };
};

export const addStop = async (routeId: string, data: FormData) => {
  const checkAuth = await authorize("routes", "create");
  if (!checkAuth.ok) return { error: checkAuth.error };
  const { t, tenantId } = checkAuth;

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
    return { error: t("validationFailed", { message: errorMessages }) };
  }

  const route = await prisma.route.findFirst({
    where: { id: validationResult.data.routeId, depot: { tenantId } },
    select: { id: true },
  });

  if (!route) {
    return { error: t("routeNotFound") };
  }

  const stopCount = await prisma.routeStop.count({
    where: { routeId: validationResult.data.routeId },
  });

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
};

export const deleteStop = async (stopId: string, routeId: string) => {
  const checkAuth = await authorize("routes", "delete");
  if (!checkAuth.ok) return { error: checkAuth.error };
  const { tenantId } = checkAuth;

  await prisma.routeStop.deleteMany({
    where: { id: stopId, route: { depot: { tenantId } } },
  });
  const locale = await getLocale();
  revalidatePath(`/${locale}/routes/${routeId}`);
};
