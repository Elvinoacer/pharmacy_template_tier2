import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import {
  LOCATION_HANDOFF_TTL_SECONDS,
  signLocationHandoff,
  verifyLocationHandoff,
} from "@/app/lib/location-handoff";

const MAX_HANDOFF_ACCURACY_METERS = 400;
const HANDOFF_TYPES = [
  "location_handoff_created",
  "location_handoff_completed",
  "location_handoff_cancelled",
] as const;

type JsonRecord = Record<string, unknown>;

type ResolvedLocation = {
  city: string | null;
  county: string | null;
  country: string | null;
  countryCode: string | null;
  displayName: string | null;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function readString(record: JsonRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(record: JsonRecord, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function cleanAdministrativeName(value: string | null | undefined): string | null {
  const cleaned = value?.trim();
  if (!cleaned) return null;
  return cleaned.replace(/\s+County$/i, "").trim() || null;
}

function numberFrom(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(number) ? number : null;
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

async function reverseGeocode(latitude: number, longitude: number): Promise<ResolvedLocation> {
  const empty: ResolvedLocation = {
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
    url.searchParams.set("zoom", "16");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "en");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Aether Pharmacy Network/1.0 (phone location handoff)",
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
    const city =
      address.city ??
      address.town ??
      address.village ??
      address.municipality ??
      address.city_district ??
      address.suburb ??
      null;
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

async function getLifecycle(pharmacyId: string, handoffId: string) {
  const latestCreated = await prismaUnscoped.pharmacyOnboardingEvent.findFirst({
    where: { pharmacyId, type: "location_handoff_created" },
    orderBy: { createdAt: "desc" },
  });

  if (!latestCreated) return { status: "missing" as const, expiresAt: null, completed: null };

  const createdMeta = asRecord(latestCreated.meta);
  const latestHandoffId = readString(createdMeta, "handoffId");
  if (latestHandoffId !== handoffId) {
    return { status: "superseded" as const, expiresAt: null, completed: null };
  }

  const expiresAtRaw = readString(createdMeta, "expiresAt");
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  const terminalEvents = await prismaUnscoped.pharmacyOnboardingEvent.findMany({
    where: {
      pharmacyId,
      type: { in: [HANDOFF_TYPES[1], HANDOFF_TYPES[2]] },
      createdAt: { gte: latestCreated.createdAt },
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  const terminal = terminalEvents.find((event) => readString(asRecord(event.meta), "handoffId") === handoffId);
  if (terminal?.type === "location_handoff_completed") {
    return { status: "completed" as const, expiresAt, completed: terminal };
  }
  if (terminal?.type === "location_handoff_cancelled") {
    return { status: "cancelled" as const, expiresAt, completed: null };
  }
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    return { status: "expired" as const, expiresAt, completed: null };
  }

  return { status: "waiting" as const, expiresAt, completed: null };
}

async function ownerCanEdit(pharmacyId: string, userId: string, platformAdmin: boolean) {
  const pharmacy = await prismaUnscoped.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: { id: true, name: true, ownerUserId: true, status: true },
  });
  if (!pharmacy) return { pharmacy: null, error: "Pharmacy application not found." };
  if (pharmacy.ownerUserId !== userId && !platformAdmin) {
    return { pharmacy: null, error: "You do not own this application." };
  }
  if (!["draft", "needs_info"].includes(pharmacy.status)) {
    return { pharmacy: null, error: "This application can no longer be edited." };
  }
  return { pharmacy, error: null };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonError("Please sign in first.", 401);

    const body = (await request.json().catch(() => ({}))) as { pharmacyId?: string };
    const pharmacyId = String(body.pharmacyId || "").trim();
    if (!pharmacyId) return jsonError("Pharmacy application not found.");

    const access = await ownerCanEdit(pharmacyId, user.id, user.platformAdmin === true);
    if (!access.pharmacy) return jsonError(access.error || "Unable to start handoff.", 403);

    const handoffId = randomUUID();
    const expiresAt = new Date(Date.now() + LOCATION_HANDOFF_TTL_SECONDS * 1000);

    await prismaUnscoped.pharmacyOnboardingEvent.create({
      data: {
        pharmacyId,
        actorId: user.id,
        type: "location_handoff_created",
        message: "Secure phone location handoff created from the pharmacy onboarding session.",
        meta: {
          handoffId,
          expiresAt: expiresAt.toISOString(),
          ownerUserId: user.id,
        },
      },
    });

    const token = await signLocationHandoff(
      { handoffId, pharmacyId, ownerUserId: user.id },
      expiresAt,
    );
    const mobileUrl = new URL("/onboard/location-handoff", request.nextUrl.origin);
    mobileUrl.searchParams.set("token", token);

    return NextResponse.json({
      ok: true,
      handoffId,
      mobileUrl: mobileUrl.toString(),
      expiresAt: expiresAt.toISOString(),
      pharmacyName: access.pharmacy.name,
    });
  } catch (error) {
    console.error("[location-handoff] create", error);
    return jsonError("Could not create the phone handoff. Please try again.", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (token) {
      const claim = await verifyLocationHandoff(token);
      if (!claim) return jsonError("This location handoff has expired or is invalid.", 410);

      const pharmacy = await prismaUnscoped.pharmacy.findUnique({
        where: { id: claim.pharmacyId },
        select: {
          id: true,
          name: true,
          ownerUserId: true,
          status: true,
          latitude: true,
          longitude: true,
          city: true,
          county: true,
          country: true,
        },
      });
      if (!pharmacy || pharmacy.ownerUserId !== claim.ownerUserId) {
        return jsonError("This location handoff is no longer valid.", 410);
      }

      const lifecycle = await getLifecycle(claim.pharmacyId, claim.handoffId);
      const completedMeta = lifecycle.completed ? asRecord(lifecycle.completed.meta) : {};
      return NextResponse.json({
        ok: true,
        status: lifecycle.status,
        pharmacyName: pharmacy.name,
        expiresAt: lifecycle.expiresAt?.toISOString() || null,
        ...(lifecycle.status === "completed"
          ? {
              latitude: pharmacy.latitude,
              longitude: pharmacy.longitude,
              city: pharmacy.city,
              county: pharmacy.county,
              country: pharmacy.country,
              accuracyMeters: readNumber(completedMeta, "accuracyMeters"),
            }
          : {}),
      });
    }

    const user = await getSessionUser();
    if (!user) return jsonError("Please sign in first.", 401);

    const pharmacyId = String(request.nextUrl.searchParams.get("pharmacyId") || "").trim();
    const handoffId = String(request.nextUrl.searchParams.get("handoffId") || "").trim();
    if (!pharmacyId || !handoffId) return jsonError("Handoff information is incomplete.");

    const access = await ownerCanEdit(pharmacyId, user.id, user.platformAdmin === true);
    if (!access.pharmacy) return jsonError(access.error || "Unable to check handoff.", 403);

    const lifecycle = await getLifecycle(pharmacyId, handoffId);
    const pharmacy = lifecycle.status === "completed"
      ? await prismaUnscoped.pharmacy.findUnique({
          where: { id: pharmacyId },
          select: { latitude: true, longitude: true, city: true, county: true, country: true },
        })
      : null;
    const completedMeta = lifecycle.completed ? asRecord(lifecycle.completed.meta) : {};

    return NextResponse.json({
      ok: true,
      status: lifecycle.status,
      expiresAt: lifecycle.expiresAt?.toISOString() || null,
      ...(pharmacy
        ? {
            latitude: pharmacy.latitude,
            longitude: pharmacy.longitude,
            city: pharmacy.city,
            county: pharmacy.county,
            country: pharmacy.country,
            accuracyMeters: readNumber(completedMeta, "accuracyMeters"),
          }
        : {}),
    });
  } catch (error) {
    console.error("[location-handoff] status", error);
    return jsonError("Could not check the phone handoff.", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      token?: string;
      latitude?: number;
      longitude?: number;
      accuracyMeters?: number;
    };
    const claim = await verifyLocationHandoff(body.token);
    if (!claim) return jsonError("This location handoff has expired or is invalid.", 410);

    const pharmacy = await prismaUnscoped.pharmacy.findUnique({
      where: { id: claim.pharmacyId },
      select: { id: true, name: true, ownerUserId: true, status: true },
    });
    if (!pharmacy || pharmacy.ownerUserId !== claim.ownerUserId) {
      return jsonError("This location handoff is no longer valid.", 410);
    }
    if (!["draft", "needs_info"].includes(pharmacy.status)) {
      return jsonError("This pharmacy application can no longer be edited.", 409);
    }

    const lifecycle = await getLifecycle(claim.pharmacyId, claim.handoffId);
    if (lifecycle.status === "completed") {
      const current = await prismaUnscoped.pharmacy.findUnique({
        where: { id: claim.pharmacyId },
        select: { latitude: true, longitude: true, city: true, county: true, country: true },
      });
      return NextResponse.json({ ok: true, status: "completed", ...current });
    }
    if (lifecycle.status !== "waiting") {
      return jsonError("This location handoff is no longer active. Scan a new QR code from the computer.", 410);
    }

    const latitude = numberFrom(body.latitude);
    const longitude = numberFrom(body.longitude);
    const accuracyMeters = numberFrom(body.accuracyMeters);
    if (latitude == null || longitude == null || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return jsonError("The phone returned an invalid location. Please try again.");
    }
    if (accuracyMeters == null || accuracyMeters <= 0) {
      return jsonError("The phone did not report location accuracy. Please try again.");
    }
    if (accuracyMeters > MAX_HANDOFF_ACCURACY_METERS) {
      return jsonError(
        `The phone location is still too broad (about ±${Math.round(accuracyMeters)} m). Turn on precise location/GPS and try again.`,
      );
    }

    const reverse = await reverseGeocode(latitude, longitude);
    if (reverse.countryCode && reverse.countryCode !== "ke") {
      return jsonError(`This location appears to be in ${reverse.country || "another country"}. A Kenyan pharmacy location is required.`);
    }
    if (!reverse.city) return jsonError("We found the GPS position but could not resolve the city or town. Try again outdoors or near a window.");
    if (!reverse.county) return jsonError("We found the GPS position but could not resolve the Kenyan county reliably. Please try again.");

    const city = reverse.city;
    const county = reverse.county;
    const country = reverse.country || "Kenya";

    await prismaUnscoped.$transaction([
      prismaUnscoped.pharmacy.update({
        where: { id: claim.pharmacyId },
        data: { latitude, longitude, city, county, country },
      }),
      prismaUnscoped.pharmacySettings.updateMany({
        where: { pharmacyId: claim.pharmacyId },
        data: { latitude, longitude, city, state: county, country },
      }),
      prismaUnscoped.pharmacyOnboardingEvent.create({
        data: {
          pharmacyId: claim.pharmacyId,
          actorId: null,
          type: "location_handoff_completed",
          message: `Premises location received from secure phone handoff: ${latitude}, ${longitude}; derived area ${city}, ${county}; accuracy ±${Math.round(accuracyMeters)} m.`,
          meta: {
            handoffId: claim.handoffId,
            accuracyMeters,
            city,
            county,
            country,
            capturedAt: new Date().toISOString(),
            source: "phone_geolocation_handoff",
          },
        },
      }),
    ]);

    revalidatePath("/onboard");
    revalidatePath("/admin/settings/location");
    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      status: "completed",
      latitude,
      longitude,
      city,
      county,
      country,
      accuracyMeters,
      displayName: reverse.displayName,
    });
  } catch (error) {
    console.error("[location-handoff] complete", error);
    return jsonError("Could not send the phone location to the computer. Please try again.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonError("Please sign in first.", 401);
    const body = (await request.json().catch(() => ({}))) as { pharmacyId?: string; handoffId?: string };
    const pharmacyId = String(body.pharmacyId || "").trim();
    const handoffId = String(body.handoffId || "").trim();
    if (!pharmacyId || !handoffId) return jsonError("Handoff information is incomplete.");

    const access = await ownerCanEdit(pharmacyId, user.id, user.platformAdmin === true);
    if (!access.pharmacy) return jsonError(access.error || "Unable to cancel handoff.", 403);

    const lifecycle = await getLifecycle(pharmacyId, handoffId);
    if (lifecycle.status === "waiting") {
      await prismaUnscoped.pharmacyOnboardingEvent.create({
        data: {
          pharmacyId,
          actorId: user.id,
          type: "location_handoff_cancelled",
          message: "Phone location handoff cancelled from the desktop onboarding session.",
          meta: { handoffId, cancelledAt: new Date().toISOString() },
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[location-handoff] cancel", error);
    return jsonError("Could not cancel the phone handoff.", 500);
  }
}
