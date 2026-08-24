import { platform } from "@/app/lib/data";

/**
 * Shared public-surface helpers. Safe to import from client components.
 *
 * Platform chrome: marketplace, onboarding, legal, auth.
 * Storefront chrome: a specific pharmacy (`/p/{slug}` or cookie-scoped shop pages).
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

/** Shop actions that only make sense after a pharmacy is chosen. */
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
 * Public routes are tenant-aware by default unless they are explicitly part
 * of the platform/network surface. A selected pharmacy therefore follows the
 * patient across deep links such as `/health/*`, not only `/p/:slug/*`.
 */
export function publicSurface(
  pathname: string,
  pharmacySlug: string | null | undefined,
): "platform" | "storefront" {
  if (isPlatformPath(pathname)) return "platform";
  if (isStorefrontUrl(pathname)) return "storefront";
  if (pharmacySlug) return "storefront";
  return "storefront";
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
 * Neutral fallback for tenant-aware public pages when a patient has not yet
 * selected a pharmacy. This is deliberately NOT the demo Aether tenant.
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
