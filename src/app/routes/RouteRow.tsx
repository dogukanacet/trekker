"use client";

import React from "react";
import type { Route, Depot } from "@prisma/client";
import * as routeActions from "@/app/routes/actions";
import Link from "next/link";

const RouteRow = ({ route, depotList }: { route: Route; depotList: Depot[] }) => {
  const depotName = depotList.find((depot) => depot.id === route.depotId)?.name;
  return (
    <li className="list-item" key={route.id}>
      <Link href={`/routes/${route.id}`}>
        {route.name} - {depotName}
        {route.createdAt && <span> - Created: {route.createdAt.toLocaleDateString("tr")}</span>}
        <form action={routeActions.deleteRoute.bind(null, route.id)} style={{ display: "inline" }}>
          <button
            className="ml-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
            type="submit"
          >
            Delete Route
          </button>
        </form>
      </Link>
    </li>
  );
};

export default RouteRow;
