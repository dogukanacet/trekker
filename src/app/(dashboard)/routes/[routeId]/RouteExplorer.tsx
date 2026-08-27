"use client";

import { useState } from "react";
import type { RouteStop } from "@prisma/client";
import * as routeActions from "@/app/(dashboard)/routes/actions";
import RouteMapLoader from "./RouteMapLoader";

export default function RouteExplorer({ stops, routeId }: { stops: RouteStop[]; routeId: string }) {
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  return (
    <>
      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <RouteMapLoader selectedStopId={selectedStopId} stops={stops} />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Duraklar</h2>
        {stops.length ? (
          <ul className="mt-4 divide-y divide-gray-100">
            {stops.map((stop, i) => (
              <li
                onClick={() => setSelectedStopId(stop.id)}
                key={stop.id}
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 rounded-xl"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                  {i + 1}
                </span>
                <span className="font-medium text-gray-800">{stop.label}</span>
                <span className="ml-auto font-mono text-sm text-gray-400">
                  {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                </span>
                <form
                  action={routeActions.deleteStop.bind(null, stop.id, routeId)}
                  style={{ display: "inline" }}
                >
                  <button
                    className="ml-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                    type="submit"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Delete Stop
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-gray-500">Henüz durak eklenmedi.</p>
        )}
      </div>
    </>
  );
}
