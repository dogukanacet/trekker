"use client";

import React, { useState, useActionState, useEffect } from "react";
import type { Driver, Depot } from "@prisma/client";
import * as driverActions from "./actions";

const DriverRow = ({ driver, depotList }: { driver: Driver; depotList: Depot[] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [actionState, formAction, isPending] = useActionState(
    driverActions.updateDriver.bind(null, driver.id),
    { error: null },
  );

  useEffect(() => {
    if (!actionState.error) setIsEditing(false);
  }, [actionState.error]);

  const updateDriverForm = () => {
    return (
      <form
        action={formAction}
        style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}
      >
        <input
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="text"
          name="fullName"
          defaultValue={driver.fullName}
          placeholder="fullName"
        />
        <input
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          type="date"
          name="licenseUntil"
          defaultValue={driver.licenseUntil ? driver.licenseUntil.toISOString().split("T")[0] : ""}
          placeholder="License Until"
        />
        <select
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          name="depotId"
          defaultValue={driver.depotId}
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
          disabled={isPending}
        >
          {isPending ? "Updating..." : "Update Driver"}
        </button>
      </form>
    );
  };

  return (
    <li className="list-item" key={driver.id}>
      {driver.fullName} - {driver.depotId}
      {driver.licenseUntil && (
        <span> - License Until: {driver.licenseUntil.toLocaleDateString("tr")}</span>
      )}
      <button
        className="ml-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
        onClick={() => setIsEditing(!isEditing)}
      >
        Update Driver
      </button>
      {isEditing && updateDriverForm()}
      <form action={driverActions.deleteDriver.bind(null, driver.id)} style={{ display: "inline" }}>
        <button
          className="ml-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
          type="submit"
          disabled={isPending}
        >
          Delete Driver
        </button>
        {actionState.error && <p className="text-red-500">{actionState.error}</p>}
      </form>
    </li>
  );
};

export default DriverRow;
