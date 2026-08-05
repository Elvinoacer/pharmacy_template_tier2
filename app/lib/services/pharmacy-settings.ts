import "server-only";

import { prisma } from "@/app/lib/db";
import { pharmacy as staticPharmacy } from "@/app/lib/data";

export type PharmacyHour = { day: string; time: string };

export type ResolvedPharmacy = {
  name: string;
  phone: string;
  phoneHref: string;
  email: string;
  whatsapp: string;
  whatsappHref: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    full: string;
    line2?: string | null;
    country?: string | null;
  };
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  mapsEmbed: string;
  mapsDirections: string;
  hours: PharmacyHour[];
  /** True when values came from admin-configured PharmacySettings row. */
  fromDb: boolean;
};

function digitsOnly(phone: string): string {
  return phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
}

function buildFullAddress(parts: {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
}): string {
  return [parts.line1, parts.line2, parts.city, parts.state, parts.zip, parts.country]
    .map((p) => (p || "").trim())
    .filter(Boolean)
    .join(", ");
}

/** Build a Google Maps embed URL from lat/lng (no API key required for basic embed). */
export function buildMapsEmbed(lat: number, lng: number, zoom = 16): string {
  // Using the open embed pattern that works without a Maps API key for simple pins.
  return `https://maps.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=${zoom}&output=embed`;
}

/** Google Maps directions deep link to a lat/lng destination. */
export function buildMapsDirections(lat: number, lng: number, label?: string): string {
  const destination = label
    ? encodeURIComponent(label)
    : encodeURIComponent(`${lat},${lng}`);
  // Prefer coordinates for accuracy; label helps human-readable destination text.
  if (label) {
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function buildMapsDirectionsFromAddress(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

function parseHours(raw: unknown): PharmacyHour[] {
  if (!Array.isArray(raw)) return staticPharmacy.hours;
  const parsed = raw
    .map((h) => {
      if (!h || typeof h !== "object") return null;
      const day = String((h as { day?: unknown }).day || "").trim();
      const time = String((h as { time?: unknown }).time || "").trim();
      if (!day || !time) return null;
      return { day, time };
    })
    .filter((h): h is PharmacyHour => Boolean(h));
  return parsed.length > 0 ? parsed : staticPharmacy.hours;
}

/**
 * Resolve pharmacy public profile: DB settings win over static seed data.
 * Safe to call from server components and route handlers.
 */
export async function getResolvedPharmacy(): Promise<ResolvedPharmacy> {
  let row: Awaited<ReturnType<typeof prisma.pharmacySettings.findUnique>> = null;
  try {
    row = await prisma.pharmacySettings.findUnique({ where: { id: "default" } });
  } catch {
    // DB may be unavailable during build; fall back to static.
  }

  if (!row) {
    return {
      name: staticPharmacy.name,
      phone: staticPharmacy.phone,
      phoneHref: staticPharmacy.phoneHref,
      email: staticPharmacy.email,
      whatsapp: staticPharmacy.whatsapp,
      whatsappHref: staticPharmacy.whatsappHref,
      address: { ...staticPharmacy.address },
      latitude: null,
      longitude: null,
      placeId: null,
      mapsEmbed: staticPharmacy.mapsEmbed,
      mapsDirections: staticPharmacy.mapsDirections,
      hours: staticPharmacy.hours,
      fromDb: false,
    };
  }

  const phone = row.phone?.trim() || staticPharmacy.phone;
  const email = row.email?.trim() || staticPharmacy.email;
  const whatsapp = row.whatsapp?.trim() || row.phone?.trim() || staticPharmacy.whatsapp;
  const street = row.addressLine1?.trim() || staticPharmacy.address.street;
  const city = row.city?.trim() || staticPharmacy.address.city;
  const state = row.state?.trim() || staticPharmacy.address.state;
  const zip = row.zip?.trim() || staticPharmacy.address.zip;
  const full =
    buildFullAddress({
      line1: row.addressLine1,
      line2: row.addressLine2,
      city: row.city,
      state: row.state,
      zip: row.zip,
      country: row.country,
    }) || staticPharmacy.address.full;

  const lat = row.latitude;
  const lng = row.longitude;
  const hasCoords =
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const mapsEmbed =
    row.mapsEmbedUrl?.trim() ||
    (hasCoords ? buildMapsEmbed(lat!, lng!) : staticPharmacy.mapsEmbed);

  const mapsDirections = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : buildMapsDirectionsFromAddress(full);

  return {
    name: row.displayName?.trim() || staticPharmacy.name,
    phone,
    phoneHref: `tel:${phone.replace(/\s+/g, "")}`,
    email,
    whatsapp,
    whatsappHref: `https://wa.me/${digitsOnly(whatsapp)}`,
    address: {
      street,
      city,
      state,
      zip,
      full,
      line2: row.addressLine2,
      country: row.country,
    },
    latitude: hasCoords ? lat! : null,
    longitude: hasCoords ? lng! : null,
    placeId: row.placeId,
    mapsEmbed,
    mapsDirections,
    hours: parseHours(row.hours),
    fromDb: true,
  };
}

export type PharmacySettingsInput = {
  displayName?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  placeId?: string | null;
  mapsEmbedUrl?: string | null;
  hours?: PharmacyHour[];
  updatedById?: string | null;
};

export async function upsertPharmacySettings(input: PharmacySettingsInput) {
  const data = {
    displayName: input.displayName?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    whatsapp: input.whatsapp?.trim() || null,
    addressLine1: input.addressLine1?.trim() || null,
    addressLine2: input.addressLine2?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    zip: input.zip?.trim() || null,
    country: input.country?.trim() || null,
    latitude:
      typeof input.latitude === "number" && Number.isFinite(input.latitude)
        ? input.latitude
        : null,
    longitude:
      typeof input.longitude === "number" && Number.isFinite(input.longitude)
        ? input.longitude
        : null,
    placeId: input.placeId?.trim() || null,
    mapsEmbedUrl: input.mapsEmbedUrl?.trim() || null,
    hours: (input.hours ?? []) as object,
    updatedById: input.updatedById ?? null,
  };

  return prisma.pharmacySettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });
}
