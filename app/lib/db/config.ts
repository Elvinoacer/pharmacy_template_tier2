import type { PoolConfig } from "pg";

/**
 * Build a node-pg Pool/Client config from DATABASE_URL.
 *
 * Neon hostnames can resolve to multiple A/AAAA records; some are unreachable
 * from certain networks and cause ETIMEDOUT. When DATABASE_HOSTADDR is set we
 * dial that IPv4 directly and keep the original hostname as TLS servername
 * (SNI / cert verification).
 *
 * Note: node-pg does not honor libpq's `hostaddr` query param the same way the
 * Prisma schema engine does — hence the explicit host/ssl object form here.
 */
export function buildPostgresConfig(connectionString: string): PoolConfig {
  const url = new URL(connectionString);
  const hostaddr = process.env.DATABASE_HOSTADDR?.trim();

  if (!hostaddr) {
    return {
      connectionString,
      connectionTimeoutMillis: 30_000,
      ssl: connectionString.includes("sslmode=")
        ? { rejectUnauthorized: false }
        : undefined,
    };
  }

  return {
    host: hostaddr,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    ssl: {
      rejectUnauthorized: false,
      servername: url.hostname,
    },
    connectionTimeoutMillis: 60_000,
  };
}
