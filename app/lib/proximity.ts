export type Coordinates = { latitude: number; longitude: number };
export function validCoordinates(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}
export function distanceKm(origin: Coordinates, destination: { latitude: number | null; longitude: number | null }): number | null {
  if (!validCoordinates(origin.latitude, origin.longitude) || !validCoordinates(destination.latitude, destination.longitude)) return null;
  const radians = (n: number) => n * Math.PI / 180;
  const a = Math.sin(radians(destination.latitude! - origin.latitude) / 2) ** 2 + Math.cos(radians(origin.latitude)) * Math.cos(radians(destination.latitude!)) * Math.sin(radians(destination.longitude! - origin.longitude) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
export function distanceLabel(distance: number | null | undefined) {
  if (distance == null) return null;
  return distance < 1 ? `${Math.max(100, Math.round(distance * 10) * 100)} m away` : `${distance.toFixed(1)} km away`;
}
export function proximityOrder(a: { distanceKm?: number | null }, b: { distanceKm?: number | null }) {
  return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || 0;
}
