"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { authorize } from "@/lib/authorize";
import { diffRecords } from "@/lib/audit/diff";
import { writeAudit } from "@/lib/audit/write";
import { Prisma } from "@prisma/client";

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

function routeSnapshot(r: { name: string }, depotName: string) {
  return { depot: depotName, name: r.name };
}

export const createRoute = async (
  prevState: { error: string | null; success: boolean },
  data: FormData,
) => {
  const checkAuth = await authorize("routes", "create");
  if (!checkAuth.ok) return { error: checkAuth.error, success: false };
  const { t, tenantId, userId, email } = checkAuth;

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

  await prisma.$transaction(async (tx) => {
    const created = await tx.route.create({
      data: {
        depotId: validationResult.data.depotId,
        name: validationResult.data.name,
      },
    });

    await writeAudit(tx, {
      tenantId,
      actor: { id: userId, email },
      action: "CREATE",
      resource: "routes",
      resourceId: created.id,
      resourceLabel: created.name,
      changes: diffRecords({}, routeSnapshot(created, depot.name)),
    });
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
  const { t, tenantId, userId, email } = checkAuth;

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

  // Tenant-scoped read: also closes the IDOR where any route id could be updated.
  const before = await prisma.route.findFirst({
    where: { id: routeId, depot: { tenantId } },
    include: { depot: { select: { name: true } } },
  });
  if (!before) {
    return { error: t("routeNotFound"), success: false };
  }

  await prisma.$transaction(async (tx) => {
    const after = await tx.route.update({
      where: { id: routeId },
      data: {
        depotId: validationResult.data.depotId,
        name: validationResult.data.name,
      },
    });

    await writeAudit(tx, {
      tenantId,
      actor: { id: userId, email },
      action: "UPDATE",
      resource: "routes",
      resourceId: routeId,
      resourceLabel: after.name,
      changes: diffRecords(
        routeSnapshot(before, before.depot.name),
        routeSnapshot(after, depot.name),
      ),
    });
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
  const { t, tenantId, userId, email } = checkAuth;

  const before = await prisma.route.findFirst({
    where: { id: routeId, depot: { tenantId } },
    include: { depot: { select: { name: true } } },
  });
  if (!before) {
    return { error: t("routeNotFound"), success: false };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.route.delete({ where: { id: routeId } });

      await writeAudit(tx, {
        tenantId,
        actor: { id: userId, email },
        action: "DELETE",
        resource: "routes",
        resourceId: routeId,
        resourceLabel: before.name,
        changes: diffRecords(routeSnapshot(before, before.depot.name), {}),
      });
    });
  } catch (err) {
    // P2003 = foreign key violation (the route still has dispatches).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return { error: t("routeRelation"), success: false };
    }
    throw err;
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/routes`);

  return { error: null, success: true };
};
