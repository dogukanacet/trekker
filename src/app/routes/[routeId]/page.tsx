import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import RouteMapLoader from "./RouteMapLoader";
import * as routeActions from "@/app/routes/actions";

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ routeId: string }>;
}) {
  const { routeId } = await params;
  const session = await auth();

  const routeData = await prisma.route.findFirst({
    where: { id: routeId, depot: { tenantId: session?.user?.tenantId } },
    include: { stops: { orderBy: { order: "asc" } } },
  });

  if (!routeData) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/routes" className="text-blue-500 hover:underline">
          ← Rotalara Dön
        </Link>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">{routeData.name}</h1>

        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <RouteMapLoader stops={routeData.stops} />
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Duraklar</h2>
          {routeData.stops.length ? (
            <ul className="mt-4 divide-y divide-gray-100">
              {routeData.stops.map((stop, i) => (
                <li key={stop.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                    {i + 1}
                  </span>
                  <span className="font-medium text-gray-800">{stop.label}</span>
                  <span className="ml-auto font-mono text-sm text-gray-400">
                    {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-gray-500">Henüz durak eklenmedi.</p>
          )}
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Yeni Durak Ekle</h2>
          <form
            action={routeActions.addStop.bind(null, routeId)}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Durak Adı</label>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="text"
                name="label"
                placeholder="ör. Merkez Depo"
                required
              />
            </div>
            <div className="w-full sm:w-32">
              <label className="block text-sm font-medium text-gray-700">Lat</label>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="number"
                name="lat"
                step="any"
                required
              />
            </div>
            <div className="w-full sm:w-32">
              <label className="block text-sm font-medium text-gray-700">Lng</label>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="number"
                name="lng"
                step="any"
                required
              />
            </div>
            <button
              className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
              type="submit"
            >
              Ekle
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
