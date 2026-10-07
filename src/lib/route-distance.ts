const EARTH_RADIUS_KM = 6371;
// Durak araları genelde şehir içi/karma trafik varsayımıyla tahmin ediliyor —
// gerçek trafik verisi değil, kaba bir referans.
const AVERAGE_SPEED_KMH = 40;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_KM * c;
}

export function calculateRouteSummary(
  stops: { lat: number; lng: number }[],
): { totalDistanceKm: number; estimatedDurationMinutes: number } | null {
  if (stops.length < 2) return null;

  let totalDistanceKm = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    totalDistanceKm += haversineDistanceKm(stops[i], stops[i + 1]);
  }

  const estimatedDurationMinutes = (totalDistanceKm / AVERAGE_SPEED_KMH) * 60;

  return { totalDistanceKm, estimatedDurationMinutes };
}
