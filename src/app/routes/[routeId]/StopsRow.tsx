"use client";

import React from "react";
import type { RouteStop } from "@prisma/client";
import * as routeActions from "@/app/routes/actions";

const StopRow = ({ stop, routeId }: { stop: RouteStop; routeId: string }) => {
  return (
    <li className="list-item" key={stop.id}>
      {stop.label} - {stop.lat} - {stop.lng} - {stop.order}
      <form
        action={routeActions.deleteStop.bind(null, stop.id, routeId)}
        style={{ display: "inline" }}
      >
        <button
          className="ml-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
          type="submit"
        >
          Delete Route Stop
        </button>
      </form>
    </li>
  );
};

export default StopRow;
