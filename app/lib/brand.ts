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
 * Chrome surface for the current URL.
 * `/` is always the network marketplace, even if a pharmacy cookie exists.
 */
export function publicSurface(
  pathname: string,
  pharmacySlug: string | null | undefined,
): "platform" | "storefront" {
  if (isStorefrontUrl(pathname)) return "storefront";
  if (isPlatformPath(pathname)) return "platform";
  if (pharmacySlug) return "storefront";
  return "platform";
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

export type TenantBrandValue = {
  name: string;
  network: string;
  slug: string | null;
};

export const defaultTenantBrand: TenantBrandValue = {
  name: platform.name,
  network: platform.legalName,
  slug: null,
};
