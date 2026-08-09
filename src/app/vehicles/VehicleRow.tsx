"use client";

import React, { useState } from "react";
import type { Vehicle, Depot } from "@prisma/client";
import * as vehicleActions from "./actions";

const VehicleRow = ({ vehicle, depotList }: { vehicle: Vehicle; depotList: Depot[] }) => {
  const [isEditing, setIsEditing] = useState(false);

  const updateVehicleForm = () => {
    return (
      <form
        action={vehicleActions.updateVehicle.bind(null, vehicle.id)}
        style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}
      >
        <input
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="text"
          name="plate"
          defaultValue={vehicle.plate}
          placeholder="Plate"
          required
        />
        <input
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="text"
          name="model"
          defaultValue={vehicle.model || ""}
          placeholder="Model"
        />
        <input
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="date"
          name="insuranceUntil"
          defaultValue={
            vehicle.insuranceUntil ? vehicle.insuranceUntil.toISOString().split("T")[0] : ""
          }
          placeholder="Insurance Until"
        />
        <input
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="date"
          name="inspectionUntil"
          defaultValue={
            vehicle.inspectionUntil ? vehicle.inspectionUntil.toISOString().split("T")[0] : ""
          }
          placeholder="Inspection Until"
        />
        <select
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          name="depotId"
          defaultValue={vehicle.depotId}
          required
        >
          {depotList.map((depot) => (
            <option key={depot.id} value={depot.id}>
              {depot.name}
            </option>
          ))}
        </select>
        <button
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          type="submit"
        >
          Update Vehicle
        </button>
      </form>
    );
  };

  return (
    <li className="list-item" key={vehicle.id}>
      {vehicle.plate} - {vehicle.depotId} {vehicle.model && <span> - Model: {vehicle.model}</span>}
      {vehicle.insuranceUntil && (
        <span> - Insurance Until: {vehicle.insuranceUntil.toLocaleDateString("tr")}</span>
      )}
      {vehicle.inspectionUntil && (
        <span> - Inspection Until: {vehicle.inspectionUntil.toLocaleDateString("tr")}</span>
      )}
      <button
        className="ml-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
        onClick={() => setIsEditing(!isEditing)}
      >
        Update Vehicle
      </button>
      {isEditing && updateVehicleForm()}
      <form
        action={vehicleActions.deleteVehicle.bind(null, vehicle.id)}
        style={{ display: "inline" }}
      >
        <button
          className="ml-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
          type="submit"
        >
          Delete Vehicle
        </button>
      </form>
    </li>
  );
};

export default VehicleRow;
