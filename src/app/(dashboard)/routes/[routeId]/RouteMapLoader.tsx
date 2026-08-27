"use client";
import dynamic from "next/dynamic";
import type { RouteStop } from "@prisma/client";

const Map = dynamic(() => import("./RouteMap"), { ssr: false });

export default function RouteMapLoader({
  stops,
  selectedStopId,
}: {
  stops: RouteStop[];
  selectedStopId: string | null;
}) {
  return <Map stops={stops} selectedStopId={selectedStopId} />;
}
