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

export const createDispatch = async (prevState: { error: string | null }, data: FormData) => {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!session || !tenantId) {
    return { error: "User is not authenticated" };
  }

  const routeId = data.get("routeId") as string;
  const driverId = data.get("driverId") as string;
  const vehicleId = data.get("vehicleId") as string;

  const validationResult = dispatchSchema.safeParse({ routeId, vehicleId, driverId });

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map((err) => err.message).join(", ");
    return { error: `Validation failed: ${errorMessages}` };
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
    return { error: "Araç, sürücü veya rota bulunamadı ya da bu firmaya ait değil" };
  }

  await prisma.dispatch.create({
    data: {
      routeId: validationResult.data.routeId,
      vehicleId: validationResult.data.vehicleId,
      driverId: validationResult.data.driverId,
    },
  });
  revalidatePath("/dispatches");

  return { error: null };
};
