import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";
import {
  findNetworkPharmacyById,
  findNetworkPharmacyBySlug,
  listNetworkMarketplacePharmacies,
  type NetworkPublicPharmacy,
} from "@/app/lib/db/network-pharmacy";
import { DEFAULT_PHARMACY_ID, DEFAULT_PHARMACY_SLUG } from "@/app/lib/tenant-models";
import {
  failClosedId,
  peekTenant,
  PUBLIC_PHARMACY_COOKIE,
  STAFF_PHARMACY_COOKIE,
  tenantAls,
  withPharmacy,
  withPlatformBypass,
  type TenantStore,
} from "@/app/lib/tenant-context";

export {
  failClosedId,
  peekTenant,
  PUBLIC_PHARMACY_COOKIE,
  STAFF_PHARMACY_COOKIE,
  tenantAls,
  withPharmacy,
  withPlatformBypass,
};
export type { TenantStore };

export type PublicPharmacy = NetworkPublicPharmacy;

/**
 * Pharmacy identity is network-level data used to establish the tenant itself.
 * It must never be resolved through the tenant RLS pool: that creates the
 * circular chain getTenant -> pharmacy lookup -> resolveRlsScope -> getTenant.
 * The dedicated read-only network helper talks only to `pharmacies` and has no
 * dependency on tenant context.
 */
export async function findPharmacyBySlug(slug: string): Promise<PublicPharmacy | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  try {
    return await findNetworkPharmacyBySlug(normalized);
  } catch {
    return null;
  }
}

export async function findPharmacyById(id: string): Promise<PublicPharmacy | null> {
  const normalized = id.trim();
  if (!normalized) return null;
  try {
    return await findNetworkPharmacyById(normalized);
  } catch {
    return null;
  }
}

export async function listMarketplacePharmacies(opts?: {
  q?: string;
  city?: string;
  county?: string;
}): Promise<PublicPharmacy[]> {
  try {
    return await listNetworkMarketplacePharmacies(opts);
  } catch {
    return [];
  }
}

/**
 * Per-request tenant. Prefers ALS (cron / explicit withPharmacy), then request
 * headers set by proxy.ts, then staff cookie.
 *
 * Public tenant context is URL-addressed: proxy.ts turns an explicit /p/:slug
 * room, or a previously selected public pharmacy on tenant-dependent routes,
 * into x-pharmacy-slug. The row is validated here before a tenant is accepted.
 */
const STAFF_RESOLVABLE_STATUS = new Set(["approved", "active"]);
const PUBLIC_RESOLVABLE_STATUS = new Set(["active"]);

export const getTenant = cache(async (): Promise<TenantStore> => {
  const fromAls = peekTenant();
  if (fromAls) return fromAls;

  try {
    const h = await headers();
    if (h.get("x-platform-bypass") === "1") {
      return { pharmacyId: null, slug: null, bypass: true };
    }
    const headerId = h.get("x-pharmacy-id")?.trim();
    if (headerId) {
      const row = await findPharmacyById(headerId);
      if (row && STAFF_RESOLVABLE_STATUS.has(row.status)) {
        return { pharmacyId: row.id, slug: row.slug, bypass: false };
      }
    }
    const headerSlug = h.get("x-pharmacy-slug")?.trim();
    if (headerSlug) {
      const row = await findPharmacyBySlug(headerSlug);
      if (row && PUBLIC_RESOLVABLE_STATUS.has(row.status)) {
        return { pharmacyId: row.id, slug: row.slug, bypass: false };
      }
    }
  } catch {
    // No request context (build, seed) or network tenant lookup unavailable.
  }

  try {
    const jar = await cookies();
    const staffId = jar.get(STAFF_PHARMACY_COOKIE)?.value;
    if (staffId) {
      const row = await findPharmacyById(staffId);
      if (row && STAFF_RESOLVABLE_STATUS.has(row.status)) {
        return { pharmacyId: row.id, slug: row.slug, bypass: false };
      }
    }
  } catch {
    // ignore
  }

  return { pharmacyId: null, slug: null, bypass: false };
});

export async function requireTenantId(): Promise<string> {
  const t = await getTenant();
  if (t.bypass) return failClosedId();
  if (!t.pharmacyId) return failClosedId();
  return t.pharmacyId;
}

export function isActiveListed(p: { status: string; listed: boolean }): boolean {
  return p.status === "active" && p.listed;
}

export function pharmacyPath(slug: string | null | undefined, path = "/"): string {
  if (!slug) return path === "" ? "/" : path;
  const rest = path === "/" ? "" : path;
  return `/p/${slug}${rest}`;
}

export { DEFAULT_PHARMACY_ID, DEFAULT_PHARMACY_SLUG };
