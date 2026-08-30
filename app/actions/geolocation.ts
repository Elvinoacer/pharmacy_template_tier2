"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";

export type GeolocationActionState = {
  error?: string;
  success?: string;
  city?: string | null;
  county?: string | null;
  country?: string | null;
  displayName?: string | null;
};

function parseCoordinate(value: FormDataEntryValue | null): number | null {
  if (value == null || String(value).trim() === "") return null;
  const number = Number(String(value).trim());
  return Number.isFinite(number) ? number : null;
}

function parseAccuracy(value: FormDataEntryValue | null): number | null {
  const number = parseCoordinate(value);
  if (number == null || number < 0) return null;
  return number;
}

function validateCoordinates(latitude: number | null, longitude: number | null) {
  if (latitude == null || longitude == null) return "A precise pharmacy location is required. Use the location button to pinpoint the premises.";
  if (latitude < -90 || latitude > 90) return "The captured location is invalid. Please try again.";
  if (longitude < -180 || longitude > 180) return "The captured location is invalid. Please try again.";
  return null;
}

type ReverseGeocode = {
  city: string | null;
  county: string | null;
  country: string | null;
  displayName: string | null;
};

async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocode> {
  const empty: ReverseGeocode = { city: null, county: null, country: null, displayName: null };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "en");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Aether Pharmacy Network/1.0 (pharmacy onboarding)",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return empty;
    const payload = (await response.json()) as {
      display_name?: string;
      address?: Record<string, string | undefined>;
    };
    const address = payload.address ?? {};

    // Prefer the most local locality and fall back through common OSM fields.
    const city =
      address.city ??
      address.town ??
      address.municipality ??
      address.city_district ??
      address.village ??
      address.suburb ??
      null;
    const county = address.county ?? address.state_district ?? address.state ?? null;
    const country = address.country ?? null;

    return {
      city,
      county,
      country,
      displayName: payload.display_name ?? null,
    };
  } catch {
    return empty;
  }
}

/** Save the pharmacy's precise premises pin during onboarding. */
export async function saveOnboardingPharmacyLocationAction(
  _prev: GeolocationActionState,
  formData: FormData,
): Promise<GeolocationActionState> {
  try {
    const user = await getSessionUser();
    if (!user) return { error: "Please sign in first." };

    const pharmacyId = String(formData.get("pharmacyId") || "").trim();
    if (!pharmacyId) return { error: "Pharmacy application not found." };

    const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) return { error: "Pharmacy application not found." };
    if (pharmacy.ownerUserId !== user.id && !user.platformAdmin) {
      return { error: "You do not own this application." };
    }
    if (!["draft", "needs_info"].includes(pharmacy.status)) {
      return { error: "This application can no longer be edited." };
    }

    const latitude = parseCoordinate(formData.get("latitude"));
    const longitude = parseCoordinate(formData.get("longitude"));
    const coordinateError = validateCoordinates(latitude, longitude);
    if (coordinateError) return { error: coordinateError };

    const accuracyMeters = parseAccuracy(formData.get("accuracyMeters"));
    const reverse = await reverseGeocode(latitude!, longitude!);

    // Keep manually entered values intact; GPS only fills missing location details.
    const city = pharmacy.city || reverse.city;
    const county = pharmacy.county || reverse.county;
    const country = pharmacy.country || reverse.country || "Kenya";

    await prismaUnscoped.pharmacy.update({
      where: { id: pharmacyId },
      data: { latitude, longitude, city, county, country },
    });

    await prismaUnscoped.pharmacySettings.updateMany({
      where: { pharmacyId },
      data: { latitude, longitude, city, state: county, country },
    });

    revalidatePath("/onboard");
    revalidatePath("/admin/settings/location");
    revalidatePath("/");

    return {
      success: reverse.city || reverse.county
        ? "Premises located. We filled in the nearby area details for you."
        : "Precise pharmacy location saved securely.",
      city,
      county,
      country,
      displayName: reverse.displayName,
    };
  } catch (error) {
    console.error("[geolocation] pharmacy", error);
    return { error: "Could not save the pharmacy location. Please try again." };
  }
}

/** Save/update a customer's default current location. */
export async function saveCustomerLocationAction(
  _prev: GeolocationActionState,
  formData: FormData,
): Promise<GeolocationActionState> {
  try {
    const user = await getSessionUser();
    if (!user?.customerId) return { error: "Please sign in." };

    const latitude = parseCoordinate(formData.get("latitude"));
    const longitude = parseCoordinate(formData.get("longitude"));
    const coordinateError = validateCoordinates(latitude, longitude);
    if (coordinateError) return { error: coordinateError };

    const accuracyMeters = parseAccuracy(formData.get("accuracyMeters"));
    const capturedAtRaw = String(formData.get("capturedAt") || "").trim();
    const capturedAt = capturedAtRaw ? new Date(capturedAtRaw) : new Date();
    const safeCapturedAt = Number.isNaN(capturedAt.getTime()) ? new Date() : capturedAt;
    const now = new Date();

    await prismaUnscoped.$executeRaw`
      INSERT INTO "customer_locations"
        ("id", "customer_id", "label", "latitude", "longitude", "accuracy_meters", "source", "is_default", "captured_at", "created_at", "updated_at")
      VALUES
        (${randomUUID()}::uuid, ${user.customerId}::uuid, 'Current location', ${latitude}, ${longitude}, ${accuracyMeters}, 'browser_geolocation', true, ${safeCapturedAt}, ${now}, ${now})
      ON CONFLICT ("customer_id") WHERE "is_default" = true
      DO UPDATE SET
        "latitude" = EXCLUDED."latitude",
        "longitude" = EXCLUDED."longitude",
        "accuracy_meters" = EXCLUDED."accuracy_meters",
        "source" = EXCLUDED."source",
        "captured_at" = EXCLUDED."captured_at",
        "updated_at" = EXCLUDED."updated_at"
    `;

    revalidatePath("/portal");
    revalidatePath("/portal/profile");
    revalidatePath("/portal/onboarding");

    return { success: "Your current location was saved securely." };
  } catch (error) {
    console.error("[geolocation] customer", error);
    return { error: "Could not save your location. Please try again." };
  }
}
