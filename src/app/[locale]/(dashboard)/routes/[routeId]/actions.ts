"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { authorize } from "@/lib/authorize";
import { writeAudit } from "@/lib/audit/write";

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
  const { t, tenantId, userId, email } = checkAuth;

  const label = data.get("label") as string;
  const lat = data.get("lat") as string;
  const lng = data.get("lng") as string;
  const validationResult = stopSchema.safeParse({ routeId, label, lat, lng });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.issues.map((err) => err.message).join(", ");
    return { error: t("validationFailed", { message: errorMessages }) };
  }

  const route = await prisma.route.findFirst({
    where: { id: routeId, depot: { tenantId } },
    select: { id: true, name: true },
  });

  if (!route) {
    return { error: t("routeNotFound") };
  }

  const stopCount = await prisma.routeStop.count({ where: { routeId } });

  await prisma.$transaction(async (tx) => {
    await tx.routeStop.create({
      data: {
        routeId: validationResult.data.routeId,
        label: validationResult.data.label,
        lat: validationResult.data.lat,
        lng: validationResult.data.lng,
        order: stopCount + 1,
      },
    });

    // Stops are not their own audit resource: they show up as an update of the route.
    await writeAudit(tx, {
      tenantId,
      actor: { id: userId, email },
      action: "UPDATE",
      resource: "routes",
      resourceId: routeId,
      resourceLabel: route.name,
      changes: { stop: { from: null, to: validationResult.data.label } },
    });
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
  const { tenantId, userId, email } = checkAuth;

  const stop = await prisma.routeStop.findFirst({
    where: { id: stopId, routeId, route: { depot: { tenantId } } },
    include: { route: { select: { name: true } } },
  });

  // Nothing to delete (or not this tenant's): keep the previous silent no-op behavior.
  if (!stop) return { error: null };

  await prisma.$transaction(async (tx) => {
    await tx.routeStop.delete({ where: { id: stopId } });

    await writeAudit(tx, {
      tenantId,
      actor: { id: userId, email },
      action: "UPDATE",
      resource: "routes",
      resourceId: routeId,
      resourceLabel: stop.route.name,
      changes: { stop: { from: stop.label, to: null } },
    });
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/routes/${routeId}`);

  return { error: null };
};
