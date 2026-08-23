import "server-only";

import { prisma, prismaUnscoped } from "@/app/lib/db";
import { pharmacy as staticPharmacy, platform } from "@/app/lib/data";
import { findPharmacyById, findPharmacyBySlug, getTenant } from "@/app/lib/tenant";

export type PharmacyHour = { day: string; time: string };

export type ResolvedPharmacy = {
  id: string | null;
  slug: string | null;
  name: string;
  tagline: string;
  description: string;
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
  logoUrl: string | null;
  coverImageUrl: string | null;
  about: string | null;
  deliveryNotes: string | null;
  deliveryFeeKes: number | null;
  deliveryRadiusKm: number | null;
  /** True when values came from admin-configured PharmacySettings row. */
  fromDb: boolean;
  /** True when no tenant could be resolved — do not treat as a real shop. */
  unresolved: boolean;
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
  return `https://maps.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=${zoom}&output=embed`;
}

/** Google Maps directions deep link to a lat/lng destination. */
export function buildMapsDirections(lat: number, lng: number, label?: string): string {
  const destination = label
    ? encodeURIComponent(label)
    : encodeURIComponent(`${lat},${lng}`);
  if (label) {
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function buildMapsDirectionsFromAddress(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

function parseHours(raw: unknown): PharmacyHour[] {
  // No silent fallback to seed-tenant hours — an empty array means the
  // pharmacy hasn't published hours and pages show an honest placeholder.
  if (!Array.isArray(raw)) return [];
  return raw
    .map((h) => {
      if (!h || typeof h !== "object") return null;
      const day = String((h as { day?: unknown }).day || "").trim();
      const time = String((h as { time?: unknown }).time || "").trim();
      if (!day || !time) return null;
      return { day, time };
    })
    .filter((h): h is PharmacyHour => Boolean(h));
}

function fallbackResolved(): ResolvedPharmacy {
  return {
    id: null,
    slug: null,
    name: staticPharmacy.name,
    tagline: staticPharmacy.tagline,
    description: staticPharmacy.description,
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
    logoUrl: null,
    coverImageUrl: null,
    about: null,
    deliveryNotes: null,
    deliveryFeeKes: null,
    deliveryRadiusKm: null,
    fromDb: false,
    unresolved: true,
  };
}

/**
 * Resolve pharmacy public profile: tenant Pharmacy + PharmacySettings win over static seed data.
 * Safe to call from server components and route handlers.
 */
export async function getResolvedPharmacy(opts?: {
  slug?: string | null;
  pharmacyId?: string | null;
}): Promise<ResolvedPharmacy> {
  let pharmacyId = opts?.pharmacyId ?? null;
  let slug = opts?.slug ?? null;

  if (!pharmacyId && !slug) {
    const tenant = await getTenant().catch(() => ({ pharmacyId: null, slug: null }));
    pharmacyId = tenant.pharmacyId;
    slug = tenant.slug;
  }

  const pharmacy =
    (pharmacyId ? await findPharmacyById(pharmacyId) : null) ||
    (slug ? await findPharmacyBySlug(slug) : null);

  if (!pharmacy) return fallbackResolved();

  let row: Awaited<ReturnType<typeof prismaUnscoped.pharmacySettings.findUnique>> = null;
  try {
    row = await prismaUnscoped.pharmacySettings.findUnique({
      where: { pharmacyId: pharmacy.id },
    });
  } catch {
    // DB may be unavailable during build; fall back to pharmacy row + static.
  }

  const phone = row?.phone?.trim() || pharmacy.phone || platform.phone;
  const email = row?.email?.trim() || pharmacy.email || platform.email;
  const whatsapp =
    row?.whatsapp?.trim() || pharmacy.whatsapp || row?.phone?.trim() || pharmacy.phone || platform.whatsapp;
  const street = row?.addressLine1?.trim() || "";
  const city = row?.city?.trim() || pharmacy.city || "";
  const state = row?.state?.trim() || pharmacy.county || "";
  const zip = row?.zip?.trim() || "";
  const full =
    buildFullAddress({
      line1: row?.addressLine1,
      line2: row?.addressLine2,
      city: row?.city || pharmacy.city,
      state: row?.state || pharmacy.county,
      zip: row?.zip,
      country: row?.country || pharmacy.country,
    }) || [pharmacy.city, pharmacy.country].filter(Boolean).join(", ");

  const lat = row?.latitude ?? pharmacy.latitude;
  const lng = row?.longitude ?? pharmacy.longitude;
  const hasCoords =
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const mapsEmbed =
    row?.mapsEmbedUrl?.trim() ||
    (hasCoords ? buildMapsEmbed(lat!, lng!) : "");

  const mapsDirections = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : buildMapsDirectionsFromAddress(full);

  return {
    id: pharmacy.id,
    slug: pharmacy.slug,
    name: row?.displayName?.trim() || pharmacy.name,
    tagline: row?.tagline?.trim() || pharmacy.tagline || "",
    description: pharmacy.description || "",
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
      line2: row?.addressLine2,
      country: row?.country || pharmacy.country,
    },
    latitude: hasCoords ? lat! : null,
    longitude: hasCoords ? lng! : null,
    placeId: row?.placeId ?? null,
    mapsEmbed,
    mapsDirections,
    hours: parseHours(row?.hours),
    logoUrl: row?.logoUrl || pharmacy.logoUrl,
    coverImageUrl: row?.coverImageUrl || pharmacy.coverImageUrl,
    about: row?.about ?? pharmacy.description,
    deliveryNotes: row?.deliveryNotes ?? null,
    deliveryFeeKes: row?.deliveryFeeKes != null ? Number(row.deliveryFeeKes) : null,
    deliveryRadiusKm: row?.deliveryRadiusKm ?? null,
    fromDb: Boolean(row),
    unresolved: false,
  };
}

/** Resolve the active tenant shop, or `null` when none is in context. */
export async function getResolvedPharmacyOrNull(opts?: {
  slug?: string | null;
  pharmacyId?: string | null;
}): Promise<ResolvedPharmacy | null> {
  const resolved = await getResolvedPharmacy(opts);
  if (resolved.unresolved || !resolved.slug) return null;
  return resolved;
}

export type PharmacySettingsInput = {
  displayName?: string | null;
  tagline?: string | null;
  about?: string | null;
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
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  deliveryNotes?: string | null;
  deliveryFeeKes?: number | null;
  deliveryRadiusKm?: number | null;
  careersEmail?: string | null;
  updatedById?: string | null;
};

export async function upsertPharmacySettings(input: PharmacySettingsInput) {
  const tenant = await getTenant();
  const pharmacyId = tenant.pharmacyId;
  if (!pharmacyId) throw new Error("No active pharmacy in context");

  const data = {
    displayName: input.displayName?.trim() || null,
    tagline: input.tagline?.trim() || null,
    about: input.about?.trim() || null,
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
    logoUrl: input.logoUrl?.trim() || null,
    coverImageUrl: input.coverImageUrl?.trim() || null,
    deliveryNotes: input.deliveryNotes?.trim() || null,
    deliveryFeeKes:
      typeof input.deliveryFeeKes === "number" && Number.isFinite(input.deliveryFeeKes)
        ? input.deliveryFeeKes
        : null,
    deliveryRadiusKm:
      typeof input.deliveryRadiusKm === "number" && Number.isFinite(input.deliveryRadiusKm)
        ? input.deliveryRadiusKm
        : null,
    careersEmail: input.careersEmail?.trim() || null,
    updatedById: input.updatedById ?? null,
  };

  return prisma.pharmacySettings.upsert({
    where: { pharmacyId },
    create: { pharmacyId, ...data },
    update: data,
  });
}
