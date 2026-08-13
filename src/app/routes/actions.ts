"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";

const routeSchema = z.object({
  depotId: z.string().min(1, "Depot ID is required"),
  name: z.string().min(1, "Name is required"),
});

export const createRoute = async (data: FormData) => {
  const session = await auth();
  if (!session) {
    throw new Error("User is not authenticated");
  }

  const depotId = data.get("depotId") as string;
  const name = data.get("name") as string;
  const validationResult = routeSchema.safeParse({
    depotId,
    name,
  });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    throw new Error(`Validation failed: ${errorMessages}`);
  }

  const depot = await prisma.depot.findFirst({
    where: { id: validationResult?.data?.depotId, tenantId: session?.user?.tenantId },
  });

  if (!depot) {
    throw new Error("Depot not found or does not belong to the user's tenant");
  }

  await prisma.route.create({
    data: {
      depotId: validationResult.data.depotId,
      name: validationResult.data.name,
    },
  });
  revalidatePath("/routes");
};

export const updateRoute = async (
  routeId: string,
  prevState: { error: string | null },
  data: FormData,
) => {
  const session = await auth();
  if (!session) {
    throw new Error("User is not authenticated");
  }

  const depotId = data.get("depotId") as string;
  const name = data.get("name") as string;

  const validationResult = routeSchema.safeParse({
    depotId,
    name,
  });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    return { error: `Validation failed: ${errorMessages}` };
  }

  const depot = await prisma.depot.findFirst({
    where: { id: validationResult?.data?.depotId, tenantId: session?.user?.tenantId },
  });

  if (!depot) {
    throw new Error("Depot not found or does not belong to the user's tenant");
  }

  await prisma.route.update({
    where: { id: routeId },
    data: {
      depotId: validationResult.data.depotId,
      name: validationResult.data.name,
    },
  });
  revalidatePath("/routes");

  return { error: null };
};

export const deleteRoute = async (routeId: string) => {
  const session = await auth();
  if (!session) {
    throw new Error("User is not authenticated");
  }
  await prisma.route.deleteMany({
    where: { id: routeId, depot: { tenantId: session?.user?.tenantId } },
  });
  revalidatePath("/routes");
};
