import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  const tenantId = session?.user?.tenantId;

  const vehicleCount = await prisma.vehicle.count({ where: { depot: { tenantId } } });
  const driverCount = await prisma.driver.count({ where: { depot: { tenantId } } });
  const routeCount = await prisma.route.count({ where: { depot: { tenantId } } });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const dispatchCount = await prisma.dispatch.count({
    where: {
      date: { gte: startOfToday, lt: startOfTomorrow },
      vehicle: { depot: { tenantId } },
    },
  });

  const cards = [
    { label: "Araç", count: vehicleCount, href: "/vehicles", color: "bg-blue-50 text-blue-700" },
    { label: "Sürücü", count: driverCount, href: "/drivers", color: "bg-green-50 text-green-700" },
    { label: "Rota", count: routeCount, href: "/routes", color: "bg-amber-50 text-amber-700" },
    {
      label: "Bugünkü Sevkiyat",
      count: dispatchCount,
      href: "/dispatches",
      color: "bg-purple-50 text-purple-700",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900">FleetOps</h1>
        <p className="mt-1 text-gray-500">Filo yönetim paneline hoş geldin.</p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div
                className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${card.color}`}
              >
                {card.label}
              </div>
              <p className="mt-3 text-3xl font-bold text-gray-900">{card.count}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
