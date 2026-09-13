import "server-only";
import { cookies } from "next/headers";
import { validCoordinates, type Coordinates } from "./proximity";
export const BROWSE_LOCATION_COOKIE = "aether_nearby";
export async function getBrowseLocation(): Promise<Coordinates | null> {
  const raw = (await cookies()).get(BROWSE_LOCATION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return validCoordinates(value.latitude, value.longitude) ? { latitude: value.latitude, longitude: value.longitude } : null;
  } catch { return null; }
}
