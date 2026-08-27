"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";

const dispatchSchema = z.object({
  routeId: z.string().min(1, "Route ID is required"),
  driverId: z.string().min(1, "Driver ID is required"),
  vehicleId: z.string().min(1, "Vehicle ID is required"),
});

export const createDispatch = async (data: FormData) => {
  const session = await auth();
  if (!session) {
    throw new Error("User is not authenticated");
  }

  const routeId = data.get("routeId") as string;
  const driverId = data.get("driverId") as string;
  const vehicleId = data.get("vehicleId") as string;

  const validationResult = dispatchSchema.safeParse({
    routeId,
    vehicleId,
    driverId,
  });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    throw new Error(`Validation failed: ${errorMessages}`);
  }

  await prisma.dispatch.create({
    data: {
      routeId: validationResult.data.routeId,
      vehicleId: validationResult.data.vehicleId,
      driverId: validationResult.data.driverId,
    },
  });
  revalidatePath("/drivers");
};
