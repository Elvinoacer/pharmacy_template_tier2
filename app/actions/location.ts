"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, requireStaff, writeAuditLog, AuthError } from "@/app/lib/auth";
import {
  upsertPharmacySettings,
  type PharmacyHour,
} from "@/app/lib/services/pharmacy-settings";

export type LocationActionState = {
  error?: string;
  success?: string;
};

function parseHoursText(raw: string): PharmacyHour[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length >= 2) return { day: parts[0], time: parts.slice(1).join("|").trim() };
      // fallback: "Day: Time" or "Day - Time"
      const m = line.match(/^(.+?)[:–-]\s*(.+)$/);
      if (m) return { day: m[1].trim(), time: m[2].trim() };
      return null;
    })
    .filter((h): h is PharmacyHour => Boolean(h?.day && h?.time));
}

function parseCoord(raw: FormDataEntryValue | null): number | null {
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

export async function savePharmacyLocationAction(
  _prev: LocationActionState,
  formData: FormData,
): Promise<LocationActionState> {
  try {
    const user = await getSessionUser();
    requireStaff(user);

    const latitude = parseCoord(formData.get("latitude"));
    const longitude = parseCoord(formData.get("longitude"));

    if (latitude != null && (latitude < -90 || latitude > 90)) {
      return { error: "Latitude must be between -90 and 90." };
    }
    if (longitude != null && (longitude < -180 || longitude > 180)) {
      return { error: "Longitude must be between -180 and 180." };
    }
    if ((latitude == null) !== (longitude == null)) {
      return { error: "Provide both latitude and longitude, or leave both blank." };
    }

    const hoursText = String(formData.get("hoursText") || "");
    const hours = parseHoursText(hoursText);

    await upsertPharmacySettings({
      displayName: String(formData.get("displayName") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      email: String(formData.get("email") || "") || null,
      whatsapp: String(formData.get("whatsapp") || "") || null,
      addressLine1: String(formData.get("addressLine1") || "") || null,
      addressLine2: String(formData.get("addressLine2") || "") || null,
      city: String(formData.get("city") || "") || null,
      state: String(formData.get("state") || "") || null,
      zip: String(formData.get("zip") || "") || null,
      country: String(formData.get("country") || "") || null,
      latitude,
      longitude,
      placeId: String(formData.get("placeId") || "") || null,
      mapsEmbedUrl: String(formData.get("mapsEmbedUrl") || "") || null,
      hours,
      updatedById: user!.id,
    });

    await writeAuditLog(user!.id, "pharmacy_location_updated", "pharmacy_settings", undefined, {
      latitude,
      longitude,
    });

    revalidatePath("/contact");
    revalidatePath("/admin/settings/location");
    revalidatePath("/");
    revalidatePath("/how-do-you-feel");

    return { success: "Location saved. Public map and directions will use these values." };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    console.error("[savePharmacyLocation]", e);
    return { error: "Could not save location settings." };
  }
}
