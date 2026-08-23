import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";
import { prismaUnscoped } from "@/app/lib/db/prisma";
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

export type PublicPharmacy = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  status: string;
  listed: boolean;
  featured: boolean;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  county: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  setupCompletedAt: Date | null;
};

const PHARMACY_SELECT = {
  id: true,
  slug: true,
  name: true,
  tagline: true,
  description: true,
  status: true,
  listed: true,
  featured: true,
  email: true,
  phone: true,
  whatsapp: true,
  city: true,
  county: true,
  country: true,
  latitude: true,
  longitude: true,
  logoUrl: true,
  coverImageUrl: true,
  setupCompletedAt: true,
} as const;

export async function findPharmacyBySlug(slug: string): Promise<PublicPharmacy | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  try {
    return await prismaUnscoped.pharmacy.findUnique({
      where: { slug: normalized },
      select: PHARMACY_SELECT,
    });
  } catch {
    return null;
  }
}

export async function findPharmacyById(id: string): Promise<PublicPharmacy | null> {
  if (!id) return null;
  try {
    return await prismaUnscoped.pharmacy.findUnique({
      where: { id },
      select: PHARMACY_SELECT,
    });
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
    return await prismaUnscoped.pharmacy.findMany({
      where: {
        status: "active",
        listed: true,
        ...(opts?.city ? { city: { equals: opts.city, mode: "insensitive" } } : {}),
        ...(opts?.county ? { county: { equals: opts.county, mode: "insensitive" } } : {}),
        ...(opts?.q
          ? {
              OR: [
                { name: { contains: opts.q, mode: "insensitive" } },
                { tagline: { contains: opts.q, mode: "insensitive" } },
                { city: { contains: opts.q, mode: "insensitive" } },
                { county: { contains: opts.q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      select: PHARMACY_SELECT,
    });
  } catch {
    return [];
  }
}

/**
 * Per-request tenant. Prefers ALS (cron / explicit withPharmacy), then request
 * headers set by proxy.ts, then staff/public cookies.
 *
 * Status-aware fail-closed resolution:
 *  - staff context (id)  → only `approved` or `active` pharmacies (owner must
 *                          reach /admin/setup between approval and go-live)
 *  - public context (slug) → only `active` pharmacies serve a storefront
 * A suspended, draft, or rejected tenant therefore resolves to nothing.
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
    // No request context (build, seed).
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
    const publicSlug = jar.get(PUBLIC_PHARMACY_COOKIE)?.value;
    if (publicSlug) {
      const row = await findPharmacyBySlug(publicSlug);
      if (row && PUBLIC_RESOLVABLE_STATUS.has(row.status)) {
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
