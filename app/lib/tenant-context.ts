import { AsyncLocalStorage, createHook, executionAsyncId } from "node:async_hooks";
export const STAFF_PHARMACY_COOKIE = "aether_staff_pharmacy";
export const PUBLIC_PHARMACY_COOKIE = "aether_pharmacy";

export const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

export type TenantStore = {
  pharmacyId: string | null;
  slug: string | null;
  bypass: boolean;
};

const globalTenant = globalThis as unknown as {
  __aether_tenant_als?: AsyncLocalStorage<TenantStore>;
  __aether_tenant_scopes?: Map<number, TenantStore>;
  __aether_tenant_hook?: boolean;
};

export const tenantAls: AsyncLocalStorage<TenantStore> =
  globalTenant.__aether_tenant_als ??
  (globalTenant.__aether_tenant_als = new AsyncLocalStorage<TenantStore>());

const scopes: Map<number, TenantStore> =
  globalTenant.__aether_tenant_scopes ??
  (globalTenant.__aether_tenant_scopes = new Map<number, TenantStore>());

if (!globalTenant.__aether_tenant_hook) {
  globalTenant.__aether_tenant_hook = true;
  createHook({
    init(asyncId, _type, triggerAsyncId) {
      const scope = scopes.get(triggerAsyncId);
      if (scope) scopes.set(asyncId, scope);
    },
    destroy(asyncId) {
      scopes.delete(asyncId);
    },
  }).enable();
}

function bindScope(store: TenantStore) {
  scopes.set(executionAsyncId(), store);
}

export function boundTenant(): TenantStore | undefined {
  return tenantAls.getStore() ?? scopes.get(executionAsyncId());
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if (value === null || value === undefined) return false;
  if (typeof value !== "object" && typeof value !== "function") return false;
  return typeof (value as { then?: unknown }).then === "function";
}

function runScoped<T>(store: TenantStore, fn: () => T): T {
  bindScope(store);
  return tenantAls.run(store, () => {
    const result = fn();

    // Prisma returns lazy thenables. If we return one directly from
    // AsyncLocalStorage.run(), its actual SQL may start only after the scope has
    // already unwound, causing RLS to see an empty/wrong tenant. Assimilate any
    // thenable while the tenant store is still active so the whole async chain
    // inherits the correct pharmacy/bypass context.
    if (isPromiseLike(result)) {
      return (async () => await result)() as T;
    }

    return result;
  });
}

export function withPlatformBypass<T>(fn: () => T): T {
  return runScoped({ pharmacyId: null, slug: null, bypass: true }, fn);
}

export function withPharmacy<T>(pharmacyId: string, fn: () => T, slug?: string | null): T {
  return runScoped({ pharmacyId, slug: slug ?? null, bypass: false }, fn);
}

export function failClosedId(): string {
  return ZERO_UUID;
}

export function peekTenant(): TenantStore | undefined {
  return boundTenant();
}
