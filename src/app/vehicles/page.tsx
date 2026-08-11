import { prisma } from "@/lib/prisma";
import * as vehicleActions from "@/app/vehicles/actions";
import VehicleRow from "@/app/vehicles/VehicleRow";
import Link from "next/link";

const VehiclesPage = async () => {
  const depotList = await prisma.depot.findMany();
  const vehicleList = await prisma.vehicle.findMany();

  const vehicles = vehicleList.map((vehicle) => (
    <VehicleRow key={vehicle.id} vehicle={vehicle} depotList={depotList} />
  ));

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Link href="/" className="text-blue-500 hover:underline mb-4">
        Home
      </Link>
      <h1 className="text-3xl font-bold">FleetOps Vehicles</h1>
      <div className="mt-2 text-gray-600">
        vehicle list:{" "}
        {vehicles.length ? <ul className="list-disc pl-5">{vehicles}</ul> : "No vehicles found."}
      </div>
      <form
        action={vehicleActions.createVehicle}
        style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}
      >
        <input
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="text"
          name="plate"
          placeholder="Plate"
          required
        />
        <input
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="text"
          name="model"
          placeholder="Model"
        />
        <input
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="date"
          name="insuranceUntil"
          placeholder="Insurance Until"
        />
        <input
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="date"
          name="inspectionUntil"
          placeholder="Inspection Until"
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
          Add Vehicle
        </button>
      </form>
    </main>
  );
};

export default VehiclesPage;
