import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import StopRow from "@/app/routes/[routeId]/StopsRow";
import Link from "next/link";
import * as routeActions from "@/app/routes/actions";

export default async function RouteDetailPage({ params }: { params: { routeId: string } }) {
  const { routeId } = await params;
  const session = await auth();

  const stopData = await prisma.route.findFirst({
    where: { id: routeId, depot: { tenantId: session?.user?.tenantId } },
    include: { stops: { orderBy: { order: "asc" } } },
  });

  if (!stopData) {
    return notFound();
  }

  const stops = stopData.stops.map((stop) => (
    <StopRow key={stop.id} routeId={routeId} stop={stop} />
  ));

  const createStopForm = (
    <form
      action={routeActions.addStop.bind(null, routeId)}
      style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}
    >
      <input
        className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        type="text"
        name="label"
        placeholder="Stop Label"
        required
      />
      <input
        className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        type="number"
        name="lat"
        placeholder="Lat"
        step={"any"}
        required
      />
      <input
        className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        type="number"
        name="lng"
        placeholder="Lng"
        step={"any"}
        required
      />

      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        type="submit"
      >
        Add Stop
      </button>
    </form>
  );
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Link href="/routes" className="text-blue-500 hover:underline mb-4">
        Back to Routes
      </Link>
      <h1 className="text-3xl font-bold">FleetOps Route Detail</h1>
      <div className="mt-2 text-gray-600">
        stops list: {stops.length ? <ul className="list-disc pl-5">{stops}</ul> : "No stops found."}
      </div>
      {createStopForm}
    </main>
  );
}
