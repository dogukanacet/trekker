"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createVehicle(data: FormData) {
  const depotId = data.get("depotId") as string;
  const plate = data.get("plate") as string;

  const vehicle = await prisma.vehicle.create({
    data: {
      depotId,
      plate,
    },
  });
  revalidatePath("/vehicles");
  return vehicle;
}
