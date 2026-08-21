import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildPostgresConfig } from "@/app/lib/db/config";
import { TENANT_MODELS } from "@/app/lib/tenant-models";
import { failClosedId, peekTenant } from "@/app/lib/tenant-context";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaScoped: ReturnType<typeof extendTenant> | undefined;
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

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

const READS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

function injectPharmacyId(data: Record<string, unknown> | undefined, pharmacyId: string) {
  if (!data || typeof data !== "object") return data;
  if (data.pharmacyId) return data;
  return { ...data, pharmacyId };
}

async function resolveScope(): Promise<{ bypass: boolean; pharmacyId: string | null }> {
  const als = peekTenant();
  if (als) return { bypass: als.bypass, pharmacyId: als.pharmacyId };
  // Lazy import to avoid a cycle with tenant.ts (which needs prismaUnscoped).
  const { getTenant } = await import("@/app/lib/tenant");
  try {
    const t = await getTenant();
    return { bypass: t.bypass, pharmacyId: t.pharmacyId };
  } catch {
    return { bypass: false, pharmacyId: null };
  }
}

function extendTenant(client: PrismaClient) {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.has(String(model))) {
            return query(args);
          }

          const { bypass, pharmacyId } = await resolveScope();
          if (bypass) return query(args);

          const scopedId = pharmacyId || failClosedId();
          const nextArgs = { ...(args as Record<string, unknown>) };

          if (operation === "create") {
            nextArgs.data = injectPharmacyId(
              nextArgs.data as Record<string, unknown>,
              scopedId,
            );
          } else if (operation === "createMany" || operation === "createManyAndReturn") {
            const data = nextArgs.data;
            if (Array.isArray(data)) {
              nextArgs.data = data.map((row) =>
                injectPharmacyId(row as Record<string, unknown>, scopedId),
              );
            } else {
              nextArgs.data = injectPharmacyId(data as Record<string, unknown>, scopedId);
            }
          } else if (operation === "upsert") {
            nextArgs.create = injectPharmacyId(
              nextArgs.create as Record<string, unknown>,
              scopedId,
            );
          } else if (READS.has(operation)) {
            const where = (nextArgs.where as Record<string, unknown>) || {};
            if (where.pharmacyId === undefined) {
              nextArgs.where = { ...where, pharmacyId: scopedId };
            }
          }

          const result = await query(nextArgs);

          if (
            (operation === "findUnique" || operation === "findUniqueOrThrow") &&
            result &&
            typeof result === "object" &&
            "pharmacyId" in result &&
            (result as { pharmacyId?: string }).pharmacyId &&
            (result as { pharmacyId: string }).pharmacyId !== scopedId
          ) {
            if (operation === "findUniqueOrThrow") {
              const err = new Error("Record not found in this pharmacy");
              (err as Error & { code?: string }).code = "P2025";
              throw err;
            }
            return null;
          }

          return result;
        },
      },
    },
  });
}

function getScopedClient() {
  if (!globalForPrisma.prismaScoped) {
    globalForPrisma.prismaScoped = extendTenant(getPrismaClient());
  }
  return globalForPrisma.prismaScoped;
}

/**
 * Unscoped Prisma client — users, sessions, pharmacies, medication master,
 * platform admin aggregations, seed, and cron (wrap cron in withPlatformBypass).
 */
export const prismaUnscoped = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getPrismaClient(), prop, receiver);
  },
});

/**
 * Tenant-scoped Prisma client. Models in TENANT_MODELS automatically receive
 * pharmacyId on reads/creates from the current request tenant. Use
 * prismaUnscoped or withPlatformBypass() when you intentionally need all tenants.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getScopedClient(), prop, receiver);
  },
});

export default prisma;
