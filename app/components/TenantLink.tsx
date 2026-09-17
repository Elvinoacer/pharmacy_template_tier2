"use client";

import Link from "next/link";
import { useTenantBrand } from "@/app/components/TenantBrand";
import { tenantHref } from "@/app/lib/public-storefront";

export { tenantHref };

/**
 * Tenant-aware navigation for storefront surfaces.
 *
 * On an explicit `/p/{slug}` storefront, shop-section links stay inside that
 * pharmacy. Platform pages (no slug in context) keep network URLs.
 */

export function useTenantSlug(): string | null {
  const { slug } = useTenantBrand();
  return slug ?? null;
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
