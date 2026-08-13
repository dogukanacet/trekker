import { prisma } from "@/lib/prisma";
import * as driverActions from "@/app/drivers/actions";
import DriverRow from "@/app/drivers/DriverRow";
import Link from "next/link";
import { auth } from "@/lib/auth";

const DriversPage = async () => {
  const session = await auth();
  const depotList = await prisma.depot.findMany({
    where: { tenantId: session?.user?.tenantId },
  });
  const driverList = await prisma.driver.findMany({
    where: { depot: { tenantId: session?.user?.tenantId } },
  });

  const drivers = driverList.map((driver) => (
    <DriverRow key={driver.id} driver={driver} depotList={depotList} />
  ));

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Link href="/" className="text-blue-500 hover:underline mb-4">
        Home
      </Link>
      <h1 className="text-3xl font-bold">FleetOps Drivers</h1>
      <div className="mt-2 text-gray-600">
        driver list:{" "}
        {drivers.length ? <ul className="list-disc pl-5">{drivers}</ul> : "No drivers found."}
      </div>
      <form
        action={driverActions.createDriver}
        style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}
      >
        <input
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="text"
          name="fullName"
          placeholder="Full Name"
          required
        />
        <input
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="date"
          name="licenseUntil"
          placeholder="License Until"
          required
        />
        <select
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          name="depotId"
          required
        >
          {depotList.map((depot) => (
            <option key={depot.id} value={depot.id}>
              {depot.name}
            </option>
          ))}
        </select>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          type="submit"
        >
          Add Driver
        </button>
      </form>
    </main>
  );
};

export default DriversPage;
