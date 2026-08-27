import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import * as routeActions from "@/app/(dashboard)/routes/actions";
import RouteExplorer from "./RouteExplorer";

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
        <RouteExplorer stops={routeData.stops} routeId={routeData.id} />
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
