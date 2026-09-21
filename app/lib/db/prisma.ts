import { AsyncLocalStorage } from "node:async_hooks";
import type { Pool } from "pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildPostgresConfig } from "@/app/lib/db/config";
import { createRlsPool, resolveRlsScope, rlsGucValues } from "@/app/lib/db/rls";
import { TENANT_MODELS, TENANT_RELATION_MODELS } from "@/app/lib/tenant-models";
import { failClosedId, peekTenant, withPharmacy, withPlatformBypass } from "@/app/lib/tenant-context";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaRls: ReturnType<typeof extendRls> | undefined;
  prismaScoped: ReturnType<typeof extendTenant> | undefined;
  rlsPool: Pool | undefined;
};

const rlsTx = new AsyncLocalStorage<true>();

function getRlsPool(): Pool {
  if (!globalForPrisma.rlsPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Add it in your environment (.env.local in " +
          "dev, or your host's project settings in production).",
      );
    }
    globalForPrisma.rlsPool = createRlsPool(buildPostgresConfig(connectionString));
  }
  return globalForPrisma.rlsPool;
}

function createPrismaClient(): PrismaClient {
  const factory = new PrismaPg(getRlsPool());
  const origConnect = factory.connect.bind(factory);
  factory.connect = async () => {
    const adapter = await origConnect();
    const origStart = adapter.startTransaction.bind(adapter);
    adapter.startTransaction = async (isolation) => {
      const tx = await origStart(isolation);
      const guc = rlsGucValues(await resolveRlsScope());
      const bypass = guc.platformBypass.replace(/'/g, "");
      const pharmacyId = guc.pharmacyId.replace(/'/g, "");
      await tx.executeRaw({
        sql: `SELECT set_config('app.platform_bypass', '${bypass}', true), set_config('app.pharmacy_id', '${pharmacyId}', true)`,
        args: [],
        argTypes: [],
      });
      return tx;
    };
    return adapter;
  };
  return new PrismaClient({
    adapter: factory,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

function extendRls(client: PrismaClient) {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          return query(args);
        },
      },
    },
  });
}

function getRlsClient() {
  if (!globalForPrisma.prismaRls) {
    globalForPrisma.prismaRls = extendRls(getPrismaClient());
  }
  return globalForPrisma.prismaRls;
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
    globalForPrisma.prismaScoped = extendTenant(getRlsClient() as unknown as PrismaClient);
  }
  return globalForPrisma.prismaScoped;
}

/**
 * Unscoped Prisma client — users, sessions, pharmacies, medication master,
 * platform admin aggregations, seed, and cron (wrap cron in withPlatformBypass).
 */
export const prismaUnscoped = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getRlsClient(), prop, receiver);
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
  return withPharmacy(pharmacyId, async () => {
    const client = getPrismaClient();
    return client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.pharmacy_id', ${pharmacyId}, true), set_config('app.platform_bypass', '', true)`;
      return fn(tx as unknown as PrismaClient);
    }, { maxWait: 15000, timeout: 30000 });
  });
}

/** Platform-wide transaction: explicit bypass GUC, never implied by NULL tenant. */
export async function withPlatformTx<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
  return withPlatformBypass(async () => {
    const client = getPrismaClient();
    return client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.platform_bypass', '1', true), set_config('app.pharmacy_id', '', true)`;
      return fn(tx as unknown as PrismaClient);
    }, { maxWait: 15000, timeout: 30000 });
  });
}

export default prisma;
