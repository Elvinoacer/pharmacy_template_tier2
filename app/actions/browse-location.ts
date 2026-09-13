"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { validCoordinates } from "@/app/lib/proximity";
import { BROWSE_LOCATION_COOKIE } from "@/app/lib/browse-location";
export async function setBrowseLocation(latitude: number | null, longitude: number | null) {
  const jar = await cookies();
  if (latitude == null && longitude == null) jar.delete(BROWSE_LOCATION_COOKIE);
  else {
    if (!validCoordinates(latitude, longitude)) return { error: "Could not read that location. Please try again." };
    jar.set(BROWSE_LOCATION_COOKIE, JSON.stringify({ latitude: Number(latitude!.toFixed(3)), longitude: Number(longitude!.toFixed(3)) }), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 });
  }
  for (const path of ["/medicines", "/services", "/pharmacies", "/portal"]) revalidatePath(path);
  return { success: true };
}
