import { platform } from "@/app/lib/data";

/**
 * Shared public-surface helpers. Safe to import from client components.
 *
 * Platform chrome: marketplace, network health library, onboarding, legal, auth.
 * Storefront chrome: an explicitly addressed pharmacy (`/p/{slug}/...`).
 *
 * IMPORTANT: a pharmacy cookie does not change the public surface. The URL
 * itself must identify the tenant with `/p/{slug}`.
 */

export const PLATFORM_PREFIXES = [
  "/for-pharmacies",
  "/onboard",
  "/pharmacies",
  "/privacy",
  "/terms",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
] as const;

/** Shop actions that only make sense after a pharmacy is explicitly chosen. */
export const STOREFRONT_ACTION_PREFIXES = [
  "/refill",
  "/order",
  "/medicines",
  "/services",
  "/vaccinations",
  "/delivery",
  "/contact",
  "/careers",
  "/faq",
  "/screenings",
  "/preventive",
  "/search",
  "/how-do-you-feel",
  "/storefront",
] as const;

export function isPlatformPath(pathname: string): boolean {
  if (!pathname || pathname === "/") return true;
  return PLATFORM_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isStorefrontUrl(pathname: string): boolean {
  return /^\/p\/[a-z0-9][a-z0-9-]{1,60}(\/|$)/i.test(pathname);
}

/**
 * A public page is a pharmacy storefront ONLY when the URL explicitly names
 * the pharmacy with `/p/{slug}`. Generic public pages remain platform pages,
 * even when a previous pharmacy selection exists in a cookie.
 */
export function publicSurface(
  pathname: string,
  _pharmacySlug?: string | null,
): "platform" | "storefront" {
  return isStorefrontUrl(pathname) ? "storefront" : "platform";
}

export type PublicBrand = {
  name: string;
  tagline: string;
  phone: string;
  phoneHref: string;
  email: string;
  addressShort: string;
  addressFull: string;
  hours: { day: string; time: string }[];
  whatsappHref: string;
  slug: string | null;
  logoUrl: string | null;
};

export function platformBrand(): PublicBrand {
  return {
    name: platform.name,
    tagline: platform.tagline,
    phone: platform.phone,
    phoneHref: platform.phoneHref,
    email: platform.email,
    addressShort: "Kenya",
    addressFull: "Licensed pharmacies across Kenya",
    hours: [],
    whatsappHref: platform.whatsappHref,
    slug: null,
    logoUrl: null,
  };
}

/**
 * Neutral tenant fallback retained for components that need a safe value, but
 * it is not used to turn generic public routes into a storefront.
 */
export function unscopedPublicBrand(): PublicBrand {
  return {
    name: "Pharmacy",
    tagline: "Local pharmacy care, online",
    phone: platform.phone,
    phoneHref: platform.phoneHref,
    email: platform.email,
    addressShort: "Kenya",
    addressFull: "Licensed pharmacies across Kenya",
    hours: [],
    whatsappHref: platform.whatsappHref,
    slug: null,
    logoUrl: null,
  };
}

export type TenantBrandValue = {
  name: string;
  network: string;
  slug: string | null;
};

export const defaultTenantBrand: TenantBrandValue = {
  name: "Pharmacy",
  network: platform.legalName,
  slug: null,
};
