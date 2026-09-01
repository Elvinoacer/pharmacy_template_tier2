import { AsyncLocalStorage } from "node:async_hooks";
import pg, { type Pool, type PoolClient, type PoolConfig } from "pg";
import { boundTenant } from "@/app/lib/tenant-context";

export type RlsScope = { bypass: boolean; pharmacyId: string | null };

const resolving = new AsyncLocalStorage<true>();

export function isRlsStrict(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.REQUIRE_RLS_RUNTIME_ROLE === "true" ||
    process.env.STRICT_RLS === "true"
  );
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
  } catch (err) {
    if (isRlsStrict()) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `FATAL: Failed to establish RLS runtime role '${RLS_RUNTIME_ROLE}'. Database operation aborted: ${msg}`,
      );
    }
    // Only in non-strict local development environments without the migration applied can this fall back.
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
const WRAPPED_SYMBOL = Symbol("rls_wrapped");

export function createRlsPool(config: PoolConfig): Pool {
  const pool = new pg.Pool(config);
  const origConnect = pool.connect.bind(pool) as () => Promise<PoolClient>;

  const wrapClient = (client: PoolClient & { [WRAPPED_SYMBOL]?: boolean }): PoolClient => {
    if (client[WRAPPED_SYMBOL]) return client;
    client[WRAPPED_SYMBOL] = true;
    const origClientQuery = client.query.bind(client);
    let applying = false;

    client.query = ((...args: unknown[]) => {
      const last = args[args.length - 1];
      const cb = typeof last === "function" ? (args.pop() as (err: unknown, result?: unknown) => void) : undefined;
      const execute = async () => {
        if (!applying) {
          applying = true;
          try {
            await applyRlsGuc({ query: origClientQuery as (sql: string, values?: unknown[]) => Promise<unknown> }, await resolveRlsScope());
          } finally {
            applying = false;
          }
        }
        return await (origClientQuery as (...a: unknown[]) => Promise<unknown>)(...args);
      };
      if (cb) {
        execute().then((res) => cb(null, res), (err) => cb(err));
        return undefined;
      }
      return execute();
    }) as PoolClient["query"];

    return client;
  };

  const connectWithGuc = async (): Promise<PoolClient> => {
    const client = await origConnect();
    try {
      wrapClient(client);
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
        wrapClient(client);
        return await client.query(...(args as [string, unknown[]]));
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
