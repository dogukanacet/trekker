import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function RouteDetailPage({ params }: { params: { routeId: string } }) {
  const { routeId } = await params;
  const session = await auth();

  const stopList = await prisma.route.findFirst({
    where: { id: routeId, depot: { tenantId: session?.user?.tenantId } },
    include: { stops: { orderBy: { order: "asc" } } },
  });
  console.log("stopList", stopList);

  if (!stopList) {
    return notFound();
  }
}
