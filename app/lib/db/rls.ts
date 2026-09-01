import { AsyncLocalStorage } from "node:async_hooks";
import pg, { type Pool, type PoolClient, type PoolConfig } from "pg";
import { boundTenant } from "@/app/lib/tenant-context";

export type RlsScope = { bypass: boolean; pharmacyId: string | null };

const resolving = new AsyncLocalStorage<true>();
let fallbackScope: RlsScope = { bypass: false, pharmacyId: null };

export function enterRlsScope(scope: RlsScope) {
  fallbackScope = scope;
}

/** Session GUC values for the fail-closed RLS policy. */
export function rlsGucValues(scope: RlsScope): { platformBypass: string; pharmacyId: string } {
  if (scope.bypass) return { platformBypass: "1", pharmacyId: "" };
  return { platformBypass: "", pharmacyId: scope.pharmacyId ?? "" };
}

/**
 * Tenant for Postgres GUC. ALS wins; otherwise request tenant (headers/cookies).
 * Re-entrancy guard prevents getTenant() pharmacy lookups from recursing through the pool wrap.
 */
export async function resolveRlsScope(): Promise<RlsScope> {
  const als = boundTenant();
  if (als) return { bypass: als.bypass, pharmacyId: als.pharmacyId };
  if (fallbackScope.bypass || fallbackScope.pharmacyId) return fallbackScope;
  if (resolving.getStore()) return { bypass: false, pharmacyId: null };
  return resolving.run(true, async () => {
    try {
      const { getTenant } = await import("@/app/lib/tenant");
      const t = await getTenant();
      return { bypass: t.bypass, pharmacyId: t.pharmacyId };
    } catch {
      return { bypass: false, pharmacyId: null };
    }
  });
}

export const RLS_RUNTIME_ROLE = "aether_runtime";

export async function applyRlsGuc(
  client: { query: (sql: string, values?: unknown[]) => Promise<unknown> },
  scope: RlsScope,
  isLocal = false,
): Promise<void> {
  try {
    await client.query(`SET ROLE ${RLS_RUNTIME_ROLE}`);
  } catch {
    // Role missing on databases that have not applied the runtime-role migration.
  }
  const guc = rlsGucValues(scope);
  await client.query(
    "SELECT set_config('app.platform_bypass', $1, $3), set_config('app.pharmacy_id', $2, $3)",
    [guc.platformBypass, guc.pharmacyId, isLocal],
  );
}

/**
 * Pool that sets app.pharmacy_id / app.platform_bypass on every checkout and
 * every pool.query so FORCE ROW LEVEL SECURITY sees the request tenant.
 */
export function createRlsPool(config: PoolConfig): Pool {
  const pool = new pg.Pool(config);
  const origConnect = pool.connect.bind(pool) as () => Promise<PoolClient>;

  const connectWithGuc = async (): Promise<PoolClient> => {
    const client = await origConnect();
    try {
      await applyRlsGuc(client, await resolveRlsScope());
      return client;
    } catch (err) {
      client.release();
      throw err;
    }
  };

  pool.connect = ((cb?: (err: Error | undefined, client?: PoolClient) => void) => {
    if (typeof cb === "function") {
      connectWithGuc().then(
        (client) => cb(undefined, client),
        (err: Error) => cb(err),
      );
      return undefined as unknown as Promise<PoolClient>;
    }
    return connectWithGuc();
  }) as Pool["connect"];

  pool.query = ((...args: unknown[]) => {
    const last = args[args.length - 1];
    const cb = typeof last === "function" ? (args.pop() as (err: unknown, result?: unknown) => void) : undefined;
    const run = async () => {
      const client = await origConnect();
      try {
        await applyRlsGuc(client, await resolveRlsScope());
        return await (client.query as (...a: unknown[]) => Promise<unknown>)(...args);
      } finally {
        client.release();
      }
    };
    if (cb) {
      run().then((result) => cb(null, result), (err) => cb(err));
      return undefined;
    }
    return run();
  }) as Pool["query"];

  return pool;
}
