"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { RouteStop } from "@prisma/client";

import L from "leaflet";
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const RouteMap = ({ stops }: { stops: RouteStop[] }) => {
  return (
    <MapContainer
      center={[stops[0]?.lat ?? 41.0082, stops[0]?.lng ?? 28.9784]}
      zoom={12}
      style={{ height: "400px", width: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {stops.map((stop) => (
        <Marker key={stop.id} position={[stop.lat, stop.lng]}>
          <Popup>{stop.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default RouteMap;
