import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-3xl font-bold">FleetOps</h1>
      <p className="mt-2 text-gray-600">tenant count: {prisma.tenant.count()}</p>
      <nav>
        <Link href="/vehicles" className="text-blue-500 hover:underline mr-4">
          Vehicles
        </Link>
        <Link href="/drivers" className="text-blue-500 hover:underline mr-4">
          Drivers
        </Link>
        <Link href="/routes" className="text-blue-500 hover:underline mr-4">
          Routes
        </Link>
        <Link href="/dispatches" className="text-blue-500 hover:underline mr-4">
          Dispatches
        </Link>
      </nav>
    </main>
  );
}
