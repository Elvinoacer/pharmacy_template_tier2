"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";

export type GeolocationActionState = {
  error?: string;
  success?: string;
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
  if (latitude == null || longitude == null) return "A valid latitude and longitude are required.";
  if (latitude < -90 || latitude > 90) return "Latitude must be between -90 and 90.";
  if (longitude < -180 || longitude > 180) return "Longitude must be between -180 and 180.";
  return null;
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

    await prismaUnscoped.pharmacy.update({
      where: { id: pharmacyId },
      data: { latitude, longitude },
    });

    // Keep the existing public location/settings record in sync with the
    // tenant's canonical coordinates. The admin location page already reads
    // from this table.
    await prismaUnscoped.pharmacySettings.updateMany({
      where: { pharmacyId },
      data: { latitude, longitude },
    });

    revalidatePath("/onboard");
    revalidatePath("/admin/settings/location");
    revalidatePath("/");

    return { success: "Precise pharmacy location saved." };
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
