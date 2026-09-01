import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildPostgresConfig } from "@/app/lib/db/config";
import { TENANT_MODELS, TENANT_RELATION_MODELS } from "@/app/lib/tenant-models";
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

/**
 * Where-filtered operations. `pharmacyId` (or the owning relation filter) is
 * injected into `where` unless the caller already pinned a tenant.
 */
const WHERE_OPERATIONS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "updateManyAndReturn",
  "deleteMany",
  // Single-record mutations — scoped via extended where unique so a foreign
  // id simply matches zero rows (P2025) instead of mutating another tenant.
  "update",
  "delete",
  "upsert",
]);

export class TenantRequiredError extends Error {
  constructor(model?: string) {
    super(model ? `TENANT_REQUIRED:${model}` : "TENANT_REQUIRED");
    this.name = "TenantRequiredError";
  }
}

const MUTATING_OPS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
  "upsert",
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
          const modelName = String(model);

          if (!TENANT_MODELS.has(modelName) && !TENANT_RELATION_MODELS.has(modelName)) {
            return query(args);
          }

          const { bypass, pharmacyId } = await resolveScope();
          if (bypass) return query(args);

          if (!pharmacyId && MUTATING_OPS.has(operation) && !TENANT_RELATION_MODELS.has(modelName)) {
            throw new TenantRequiredError(modelName);
          }

          const scopedId = pharmacyId || failClosedId();
          const nextArgs = { ...(args as Record<string, unknown>) };
          const relation = TENANT_RELATION_MODELS.get(modelName);

          if (operation === "create") {
            if (!relation) {
              nextArgs.data = injectPharmacyId(
                nextArgs.data as Record<string, unknown>,
                scopedId,
              );
            }
          } else if (operation === "createMany" || operation === "createManyAndReturn") {
            if (!relation) {
              const data = nextArgs.data;
              if (Array.isArray(data)) {
                nextArgs.data = data.map((row) =>
                  injectPharmacyId(row as Record<string, unknown>, scopedId),
                );
              } else {
                nextArgs.data = injectPharmacyId(data as Record<string, unknown>, scopedId);
              }
            }
          } else if (operation === "upsert") {
            if (!relation) {
              nextArgs.create = injectPharmacyId(
                nextArgs.create as Record<string, unknown>,
                scopedId,
              );
            }
          }

          if (WHERE_OPERATIONS.has(operation)) {
            const where = (nextArgs.where as Record<string, unknown>) || {};
            const alreadyPinned =
              where.pharmacyId !== undefined ||
              (relation !== undefined && where[relation] !== undefined);
            if (!alreadyPinned) {
              if (relation) {
                // Relation-owned models: scope through their tenant parent.
                nextArgs.where = {
                  ...where,
                  [relation]: { pharmacyId: scopedId },
                };
              } else {
                nextArgs.where = { ...where, pharmacyId: scopedId };
              }
            }
          }

          const result = await query(nextArgs);

          // Belt-and-braces: never return a row owned by another tenant when
          // the caller's where could not be rewritten (e.g. compound uniques
          // that already carried pharmacyId, or a select without pharmacyId).
          if (
            result &&
            typeof result === "object" &&
            !Array.isArray(result) &&
            !relation &&
            (operation === "findUnique" ||
              operation === "findUniqueOrThrow" ||
              operation === "update" ||
              operation === "delete" ||
              operation === "upsert") &&
            !(nextArgs.select && !(nextArgs.select as Record<string, unknown>).pharmacyId)
          ) {
            const owner = (result as { pharmacyId?: string }).pharmacyId;
            if (owner && owner !== scopedId) {
              if (operation === "findUniqueOrThrow") {
                const err = new Error("Record not found in this pharmacy");
                (err as Error & { code?: string }).code = "P2025";
                throw err;
              }
              if (operation !== "findUnique") {
                // Mutation matched a foreign row — impossible after where
                // injection, but fail closed anyway.
                const err = new Error("Record not found in this pharmacy");
                (err as Error & { code?: string }).code = "P2025";
                throw err;
              }
              return null;
            }
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
 * pharmacyId on reads/creates/mutations from the current request tenant.
 * Models in TENANT_RELATION_MODELS are scoped through their tenant parent
 * relation. Use prismaUnscoped or withPlatformBypass() when you intentionally
 * need all tenants.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getScopedClient(), prop, receiver);
  },
});

/** Run work in a transaction with Postgres GUC set for RLS. */
export async function withTenantTx<T>(
  pharmacyId: string,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  const client = getPrismaClient();
  return client.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.pharmacy_id', ${pharmacyId}, true)`;
    return fn(tx as unknown as PrismaClient);
  });
}

export default prisma;
