import "server-only";

import pg, { type Pool } from "pg";
import { buildPostgresConfig } from "@/app/lib/db/config";

/**
 * Public/network-level pharmacy identity.
 *
 * This module deliberately does NOT use the application's RLS-wrapped Prisma
 * pool. Tenant discovery has to happen before tenant RLS can be established;
 * routing tenant discovery through the RLS pool creates a circular dependency:
 * getTenant() -> pharmacy lookup -> resolveRlsScope() -> getTenant().
 *
 * Keep this surface read-only and limited to the network-level `pharmacies`
 * table. Tenant-owned business data must continue to use the normal Prisma/RLS
 * clients.
 */
export type NetworkPublicPharmacy = {
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

type GlobalNetworkDb = typeof globalThis & {
  __afyvia_network_pharmacy_pool?: Pool;
};

const globalNetworkDb = globalThis as GlobalNetworkDb;

function getNetworkPool(): Pool {
  if (globalNetworkDb.__afyvia_network_pharmacy_pool) {
    return globalNetworkDb.__afyvia_network_pharmacy_pool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const base = buildPostgresConfig(connectionString);
  const pool = new pg.Pool({
    ...base,
    // Tenant discovery is a tiny indexed read. Fail quickly during a database
    // outage instead of tying up a serverless request until Vercel's 300s cap.
    connectionTimeoutMillis: 8_000,
    idleTimeoutMillis: 10_000,
    max: 3,
    allowExitOnIdle: true,
  });

  globalNetworkDb.__afyvia_network_pharmacy_pool = pool;
  return pool;
}

const PUBLIC_COLUMNS = `
  id,
  slug,
  name,
  tagline,
  description,
  status::text AS status,
  listed,
  featured,
  email,
  phone,
  whatsapp,
  city,
  county,
  country,
  latitude,
  longitude,
  logo_url AS "logoUrl",
  cover_image_url AS "coverImageUrl",
  setup_completed_at AS "setupCompletedAt"
`;

export async function findNetworkPharmacyBySlug(
  slug: string,
): Promise<NetworkPublicPharmacy | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const result = await getNetworkPool().query<NetworkPublicPharmacy>(
    `SELECT ${PUBLIC_COLUMNS}
       FROM pharmacies
      WHERE slug = $1
      LIMIT 1`,
    [normalized],
  );
  return result.rows[0] ?? null;
}

export async function findNetworkPharmacyById(
  id: string,
): Promise<NetworkPublicPharmacy | null> {
  const normalized = id.trim();
  if (!normalized) return null;

  const result = await getNetworkPool().query<NetworkPublicPharmacy>(
    `SELECT ${PUBLIC_COLUMNS}
       FROM pharmacies
      WHERE id = $1::uuid
      LIMIT 1`,
    [normalized],
  );
  return result.rows[0] ?? null;
}

export async function listNetworkMarketplacePharmacies(opts?: {
  q?: string;
  city?: string;
  county?: string;
}): Promise<NetworkPublicPharmacy[]> {
  const values: string[] = [];
  const where = ["status = 'active'", "listed = true"];

  const city = opts?.city?.trim();
  if (city) {
    values.push(city);
    where.push(`city ILIKE $${values.length}`);
  }

  const county = opts?.county?.trim();
  if (county) {
    values.push(county);
    where.push(`county ILIKE $${values.length}`);
  }

  const q = opts?.q?.trim();
  if (q) {
    values.push(`%${q}%`);
    const p = `$${values.length}`;
    where.push(`(
      name ILIKE ${p}
      OR COALESCE(tagline, '') ILIKE ${p}
      OR COALESCE(city, '') ILIKE ${p}
      OR COALESCE(county, '') ILIKE ${p}
    )`);
  }

  const result = await getNetworkPool().query<NetworkPublicPharmacy>(
    `SELECT ${PUBLIC_COLUMNS}
       FROM pharmacies
      WHERE ${where.join(" AND ")}
      ORDER BY featured DESC, name ASC`,
    values,
  );
  return result.rows;
}
