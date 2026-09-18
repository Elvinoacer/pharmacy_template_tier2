"use server";

import { withPharmacy } from "@/app/lib/tenant-context";
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

const MAX_ONBOARDING_ACCURACY_METERS = 400;

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

function cleanAdministrativeName(value: string | null | undefined): string | null {
  const cleaned = value?.trim();
  if (!cleaned) return null;
  return cleaned.replace(/\s+County$/i, "").trim() || null;
}

type ReverseGeocode = {
  city: string | null;
  county: string | null;
  country: string | null;
  countryCode: string | null;
  displayName: string | null;
};

async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocode> {
  const empty: ReverseGeocode = {
    city: null,
    county: null,
    country: null,
    countryCode: null,
    displayName: null,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("format", "jsonv2");
    // We need the administrative hierarchy, not a guessed IP locality or a
    // user-entered place. A street-level reverse lookup still returns the full
    // OSM address hierarchy used below.
    url.searchParams.set("zoom", "16");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "en");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Afyvia Pharmacy Network/1.0 (pharmacy onboarding)",
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
    const countryCode = address.country_code?.toLowerCase() || null;
    const isKenya = countryCode === "ke" || address.country?.toLowerCase() === "kenya";

    // Prefer actual settlements over broader municipalities/districts. This is
    // especially important around Kenyan metro areas where a district/suburb
    // may otherwise be surfaced as the apparent city.
    const city =
      address.city ??
      address.town ??
      address.village ??
      address.municipality ??
      address.city_district ??
      address.suburb ??
      null;

    // Kenyan counties are admin-level 4 and are commonly exposed by Nominatim
    // as `state`. `county`/`state_district` may instead describe a sub-county or
    // smaller administrative unit, so prefer `state` for Kenya.
    const county = isKenya
      ? cleanAdministrativeName(address.state ?? address.county ?? address.state_district)
      : cleanAdministrativeName(address.county ?? address.state_district ?? address.state);

    return {
      city: city?.trim() || null,
      county,
      country: address.country?.trim() || null,
      countryCode,
      displayName: payload.display_name ?? null,
    };
  } catch {
    return empty;
  }
}

/** Save the pharmacy's precise premises pin and derive its locality during onboarding. */
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
    if (accuracyMeters == null) {
      return { error: "Capture the location from your browser while at the pharmacy premises." };
    }

    if (accuracyMeters > MAX_ONBOARDING_ACCURACY_METERS) {
      return {
        error: `This location is too broad (about ±${Math.round(accuracyMeters)} m). Enable precise location/GPS or use a phone at the pharmacy, then try again.`,
      };
    }

    const reverse = await reverseGeocode(latitude!, longitude!);
    if (reverse.countryCode && reverse.countryCode !== "ke") {
      return {
        error: `This location appears to be in ${reverse.country || "another country"}. Pharmacy onboarding currently requires a premises location in Kenya.`,
      };
    }

    if (!reverse.city) {
      return {
        error: "We captured a precise premises position but could not identify the city or town. Refresh the location with GPS enabled and try again.",
      };
    }

    if (!reverse.county) {
      return {
        error: "We captured the premises position but could not resolve the Kenyan county reliably. Refresh the location and try again.",
      };
    }

    const city = reverse.city;
    const county = reverse.county;
    const country = reverse.country || "Kenya";

    await withPharmacy(pharmacyId, () => prismaUnscoped.$transaction([
      prismaUnscoped.pharmacy.update({ where: { id: pharmacyId }, data: { latitude, longitude, city, county, country } }),
      prismaUnscoped.pharmacySettings.updateMany({ where: { pharmacyId }, data: { latitude, longitude, city, state: county, country } }),
      prismaUnscoped.pharmacyOnboardingEvent.create({
        data: {
          pharmacyId,
          actorId: user.id,
          type: "verification_input_changed",
          message: `Premises location captured from high-accuracy browser geolocation: ${latitude}, ${longitude}; derived area ${city}, ${county}; accuracy ±${Math.round(accuracyMeters)} m. Reviewer must match the licensed address.`,
        },
      }),
    ]));

    revalidatePath("/onboard");
    revalidatePath("/admin/settings/location");
    revalidatePath("/");

    return {
      success: `Premises confirmed near ${city}, ${county}.`,
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
