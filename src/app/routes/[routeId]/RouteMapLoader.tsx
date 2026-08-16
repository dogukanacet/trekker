"use client";
import dynamic from "next/dynamic";
import type { RouteStop } from "@prisma/client";

const Map = dynamic(() => import("./RouteMap"), { ssr: false });

export default function RouteMapLoader({ stops }: { stops: RouteStop[] }) {
  return <Map stops={stops} />;
}
