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

type RawQuery = (sql: string, values?: unknown[]) => Promise<unknown>;

async function setRlsContext(
  query: RawQuery,
  scope: RlsScope,
  isLocal = false,
): Promise<void> {
  const guc = rlsGucValues(scope);
  await query(
    "SELECT set_config('app.platform_bypass', $1, $3), set_config('app.pharmacy_id', $2, $3)",
    [guc.platformBypass, guc.pharmacyId, isLocal],
  );
}

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
  await setRlsContext(client.query.bind(client) as RawQuery, scope, isLocal);
}

/**
 * Runtime pool with fail-closed RLS context.
 *
 * Important: context is installed exactly once immediately before the caller's
 * SQL. The previous implementation applied RLS during checkout through the
 * already-wrapped `client.query`, which recursively applied RLS again. A single
 * application query could therefore generate several SET ROLE/set_config
 * round-trips before the real SQL even started. On a remote/serverless database
 * that multiplies latency and can exhaust the function timeout on pages that
 * perform several scoped reads (for example medicines/services).
 *
 * `SET ROLE` is connection state, so it is established once per physical
 * PoolClient. The tenant GUCs are request state and are refreshed before every
 * real query using the raw pg query function, avoiding wrapper recursion.
 */
const WRAPPED_SYMBOL = Symbol("rls_wrapped");
const ROLE_READY_SYMBOL = Symbol("rls_role_ready");

type RlsPoolClient = PoolClient & {
  [WRAPPED_SYMBOL]?: boolean;
  [ROLE_READY_SYMBOL]?: Promise<void>;
};

export function createRlsPool(config: PoolConfig): Pool {
  const pool = new pg.Pool(config);
  const origConnect = pool.connect.bind(pool) as () => Promise<PoolClient>;

  const wrapClient = (client: RlsPoolClient): PoolClient => {
    if (client[WRAPPED_SYMBOL]) return client;
    client[WRAPPED_SYMBOL] = true;

    const origClientQuery = client.query.bind(client) as (...args: unknown[]) => Promise<unknown>;
    const rawQuery = origClientQuery as RawQuery;

    const ensureRuntimeRole = async () => {
      if (!client[ROLE_READY_SYMBOL]) {
        client[ROLE_READY_SYMBOL] = (async () => {
          try {
            await rawQuery(`SET ROLE ${RLS_RUNTIME_ROLE}`);
          } catch (err) {
            if (isRlsStrict()) {
              const msg = err instanceof Error ? err.message : String(err);
              throw new Error(
                `FATAL: Failed to establish RLS runtime role '${RLS_RUNTIME_ROLE}'. Database operation aborted: ${msg}`,
              );
            }
          }
        })().catch((err) => {
          delete client[ROLE_READY_SYMBOL];
          throw err;
        });
      }
      await client[ROLE_READY_SYMBOL];
    };

    client.query = ((...args: unknown[]) => {
      const last = args[args.length - 1];
      const cb =
        typeof last === "function"
          ? (args.pop() as (err: unknown, result?: unknown) => void)
          : undefined;

      const execute = async () => {
        await ensureRuntimeRole();
        await setRlsContext(rawQuery, await resolveRlsScope());
        return origClientQuery(...args);
      };

      if (cb) {
        execute().then((res) => cb(null, res), (err) => cb(err));
        return undefined;
      }
      return execute();
    }) as PoolClient["query"];

    return client;
  };

  const connectWithRls = async (): Promise<PoolClient> => {
    const client = (await origConnect()) as RlsPoolClient;
    try {
      // Do not run SQL here. The first real query applies the current request
      // scope using the raw query function. This prevents checkout-time
      // recursion and avoids applying a stale scope to an idle connection.
      return wrapClient(client);
    } catch (err) {
      client.release();
      throw err;
    }
  };

  pool.connect = ((cb?: (err: Error | undefined, client?: PoolClient) => void) => {
    if (typeof cb === "function") {
      connectWithRls().then(
        (client) => cb(undefined, client),
        (err: Error) => cb(err),
      );
      return undefined as unknown as Promise<PoolClient>;
    }
    return connectWithRls();
  }) as Pool["connect"];

  pool.query = ((...args: unknown[]) => {
    const last = args[args.length - 1];
    const cb =
      typeof last === "function"
        ? (args.pop() as (err: unknown, result?: unknown) => void)
        : undefined;

    const run = async () => {
      const client = (await origConnect()) as RlsPoolClient;
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
