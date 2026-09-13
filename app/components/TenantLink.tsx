"use client";

import Link from "next/link";
import { useTenantBrand } from "@/app/components/TenantBrand";

/**
 * Tenant-aware navigation for storefront surfaces.
 *
 * On a pharmacy surface (`/p/{slug}` or cookie-scoped shop pages) links stay
 * inside that pharmacy's storefront. On the platform surface they behave like
 * plain relative links. This keeps refill/order/contact journeys on the
 * pharmacy the customer chose instead of silently hopping to root URLs.
 */

export function useTenantSlug(): string | null {
  const { slug } = useTenantBrand();
  return slug ?? null;
}

export function tenantHref(slug: string | null | undefined, href: string): string {
  if (!slug) return href;
  if (!href.startsWith("/")) return href;
  if (/^\/(portal|login|register|forgot-password|reset-password|pharmacies|privacy|terms|onboard|admin)(?:[/?#]|$)/.test(href)) return href;
  if (href === "/") return `/p/${slug}`;
  if (href.startsWith(`/p/`)) return href;
  return `/p/${slug}${href}`;
}

export function useTenantHref(href: string): string {
  return tenantHref(useTenantSlug(), href);
}

export default function TenantLink({
  href,
  children,
  ...rest
}: React.ComponentProps<typeof Link> & { href: string }) {
  const slug = useTenantSlug();
  return (
    <Link href={tenantHref(slug, href)} {...rest}>
      {children}
    </Link>
  );
}
