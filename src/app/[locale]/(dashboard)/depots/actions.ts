"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";

const depotSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export const createDepot = async (
  prevState: { error: string | null; success: boolean },
  data: FormData,
) => {
  const t = await getTranslations("Errors");
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!session || !tenantId) {
    return { error: t("unauthenticated"), success: false };
  }

  const name = data.get("name") as string;
  const validationResult = depotSchema.safeParse({ name });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    return { error: t("validationFailed", { message: errorMessages }), success: false };
  }

  await prisma.depot.create({
    data: { name: validationResult.data.name, tenantId },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/depots`);

  return { error: null, success: true };
};

export const updateDepot = async (
  depotId: string,
  prevState: { error: string | null; success: boolean },
  data: FormData,
) => {
  const t = await getTranslations("Errors");
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!session || !tenantId) {
    return { error: t("unauthenticated"), success: false };
  }

  const name = data.get("name") as string;
  const validationResult = depotSchema.safeParse({ name });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    return { error: t("validationFailed", { message: errorMessages }), success: false };
  }

  const result = await prisma.depot.updateMany({
    where: { id: depotId, tenantId },
    data: { name: validationResult.data.name },
  });

  if (result.count === 0) {
    return { error: t("depotNotFound"), success: false };
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/depots`);

  return { error: null, success: true };
};

export const deleteDepot = async (
  depotId: string,
  prevState: { error: string | null; success: boolean },
) => {
  const t = await getTranslations("Errors");
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!session || !tenantId) {
    return { error: t("unauthenticated"), success: false };
  }

  const depot = await prisma.depot.findFirst({
    where: { id: depotId, tenantId },
    include: { _count: { select: { vehicles: true, drivers: true, routes: true } } },
  });

  if (!depot) {
    return { error: t("depotNotFound"), success: false };
  }

  const { vehicles, drivers, routes } = depot._count;
  if (vehicles > 0 || drivers > 0 || routes > 0) {
    return { error: t("depotHasRelatedRecords"), success: false };
  }

  await prisma.depot.delete({ where: { id: depotId } });

  const locale = await getLocale();
  revalidatePath(`/${locale}/depots`);

  return { error: null, success: true };
};
