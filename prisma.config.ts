import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load both files so CLI works whether secrets live in .env or .env.local.
// .env.local wins on duplicate keys (Next.js convention).
loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

/**
 * Build the datasource URL for Prisma CLI (migrate, diff, studio).
 * When DATABASE_HOSTADDR is set, inject libpq `hostaddr` so the schema
 * engine dials a reachable IPv4 while keeping the hostname for TLS/SNI.
 * Runtime app code uses buildPostgresConfig() instead (node-pg).
 */
function datasourceUrl(): string {
  const url = new URL(env("DATABASE_URL"));
  const hostaddr = process.env.DATABASE_HOSTADDR?.trim();
  if (hostaddr) {
    url.searchParams.set("hostaddr", hostaddr);
  }
  // Keep Neon TLS working under current and future node-pg/libpq SSL semantics.
  if (!url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }
  return url.toString();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: datasourceUrl(),
  },
});
