import { prisma } from "@/lib/prisma";
import DispatchGrid from "@/app/dispatches/DispatchGrid";
import { auth } from "@/lib/auth";
import Link from "next/link";
import * as dispatchActions from "@/app/dispatches/actions";

const DispatchesPage = async () => {
  const session = await auth();
  const vehicleList = await prisma.vehicle.findMany({
    where: { depot: { tenantId: session?.user?.tenantId } },
  });
  const driverList = await prisma.driver.findMany({
    where: { depot: { tenantId: session?.user?.tenantId } },
  });
  const routeList = await prisma.route.findMany({
    where: { depot: { tenantId: session?.user?.tenantId } },
  });
  const dispatchList = await prisma.dispatch.findMany({
    where: {
      vehicle: {
        depot: {
          tenantId: session?.user?.tenantId,
        },
      },
    },
    include: {
      vehicle: true,
      driver: true,
      route: true,
    },
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Link href="/" className="text-blue-500 hover:underline mb-4">
        Home
      </Link>
      <DispatchGrid dispatches={dispatchList} />
      <form
        action={dispatchActions.createDispatch}
        style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}
      >
        <select
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          name="vehicleId"
          required
        >
          {vehicleList.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              Model: {vehicle.model} - Plate: {vehicle.plate}
            </option>
          ))}
        </select>
        <select
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          name="driverId"
          required
        >
          {driverList.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.fullName}
            </option>
          ))}
        </select>
        <select
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          name="routeId"
          required
        >
          {routeList.map((route) => (
            <option key={route.id} value={route.id}>
              {route.name}
            </option>
          ))}
        </select>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          type="submit"
        >
          Add Dispatch
        </button>
      </form>
    </main>
  );
};

export default DispatchesPage;
