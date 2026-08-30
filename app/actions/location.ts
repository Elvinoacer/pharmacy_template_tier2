"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, requireStaff, writeAuditLog, AuthError } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { getTenant } from "@/app/lib/tenant";

export type LocationActionState = {
  error?: string;
  success?: string;
};

type PharmacyHour = { day: string; time: string };

function parseHoursText(raw: string): PharmacyHour[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length >= 2) return { day: parts[0], time: parts.slice(1).join("|").trim() };
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

    // Prefer tenant context; fall back to the owner's active membership so
    // post-verification setup works even if the staff cookie is missing.
    let pharmacyId: string | null = null;
    try {
      const tenant = await getTenant();
      pharmacyId = tenant.pharmacyId;
    } catch {
      pharmacyId = null;
    }
    if (!pharmacyId) {
      pharmacyId = user!.activePharmacyId || user!.memberships[0]?.pharmacyId || null;
    }
    if (!pharmacyId) {
      return { error: "No pharmacy selected. Open setup from your approved application first." };
    }

    const allowed =
      user!.platformAdmin ||
      user!.memberships.some(
        (m) => m.pharmacyId === pharmacyId && m.status === "active",
      );
    if (!allowed) {
      return { error: "You do not have access to update this pharmacy." };
    }

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

    const displayName = String(formData.get("displayName") || "").trim() || null;
    const phone = String(formData.get("phone") || "").trim() || null;
    const email = String(formData.get("email") || "").trim() || null;
    const whatsapp = String(formData.get("whatsapp") || "").trim() || null;
    const addressLine1 = String(formData.get("addressLine1") || "").trim() || null;
    const addressLine2 = String(formData.get("addressLine2") || "").trim() || null;
    const city = String(formData.get("city") || "").trim() || null;
    const state = String(formData.get("state") || "").trim() || null;
    const zip = String(formData.get("zip") || "").trim() || null;
    const country = String(formData.get("country") || "").trim() || null;

    await prismaUnscoped.pharmacySettings.upsert({
      where: { pharmacyId },
      create: {
        pharmacyId,
        displayName,
        phone,
        email,
        whatsapp,
        addressLine1,
        addressLine2,
        city,
        state,
        zip,
        country,
        latitude,
        longitude,
        placeId: String(formData.get("placeId") || "").trim() || null,
        mapsEmbedUrl: String(formData.get("mapsEmbedUrl") || "").trim() || null,
        hours: hours as object,
        updatedById: user!.id,
      },
      update: {
        displayName,
        phone,
        email,
        whatsapp,
        addressLine1,
        addressLine2,
        city,
        state,
        zip,
        country,
        latitude,
        longitude,
        placeId: String(formData.get("placeId") || "").trim() || null,
        mapsEmbedUrl: String(formData.get("mapsEmbedUrl") || "").trim() || null,
        hours: hours as object,
        updatedById: user!.id,
      },
    });

    await prismaUnscoped.pharmacy.update({
      where: { id: pharmacyId },
      data: {
        ...(displayName ? { name: displayName } : {}),
        phone,
        whatsapp,
        email: email || undefined,
        city,
        county: state,
        country: country || "Kenya",
        latitude,
        longitude,
      },
    });

    await writeAuditLog(user!.id, "pharmacy_location_updated", "pharmacy_settings", pharmacyId, {
      latitude,
      longitude,
    });

    revalidatePath("/contact");
    revalidatePath("/admin/settings/location");
    revalidatePath("/admin/setup");
    revalidatePath("/");
    revalidatePath("/how-do-you-feel");
    revalidatePath("/storefront");
    revalidatePath("/about");
    revalidatePath("/faq");
    revalidatePath("/delivery");
    revalidatePath("/careers");
    revalidatePath("/onboard");

    return { success: "Location and contact saved. You can return to the go-live checklist." };
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    console.error("[savePharmacyLocation]", e);
    return { error: "Could not save location settings. Please try again." };
  }
}
