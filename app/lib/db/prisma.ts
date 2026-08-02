import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildPostgresConfig } from "@/app/lib/db/config";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it in your environment (.env.local in " +
        "dev, or your host's project settings in production).",
    );
  }

  const adapter = new PrismaPg(buildPostgresConfig(connectionString));

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * Lazily create (and cache) the real PrismaClient.
 *
 * IMPORTANT: this must stay lazy. Constructing PrismaClient at module load
 * time means the moment ANY file imports `prisma` — even transitively, e.g.
 * app/admin/layout.tsx -> app/lib/auth.ts -> here — a missing/bad
 * DATABASE_URL throws before Next.js has a request/response to attach an
 * error boundary to. That surfaces as a generic platform-level crash page
 * (e.g. Vercel's "A server error occurred") on every route that touches
 * this import, instead of a normal caught error our own code can handle.
 * Deferring construction to first actual use means the throw happens
 * inside a request, where callers (e.g. getSessionUser) can catch it.
 */
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// A Proxy preserves the existing `prisma.model.method()` call-site shape
// used throughout the app (30+ files) while deferring the real client's
// construction until the first property is actually accessed.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getPrismaClient(), prop, receiver);
  },
});

export default prisma;
