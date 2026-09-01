import { AsyncLocalStorage, createHook, executionAsyncId } from "node:async_hooks";
import { enterRlsScope } from "@/app/lib/db/rls";

export const STAFF_PHARMACY_COOKIE = "aether_staff_pharmacy";
export const PUBLIC_PHARMACY_COOKIE = "aether_pharmacy";

export const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

export type TenantStore = {
  pharmacyId: string | null;
  slug: string | null;
  bypass: boolean;
};

export const tenantAls = new AsyncLocalStorage<TenantStore>();

const scopes = new Map<number, TenantStore>();
createHook({
  init(asyncId, _type, triggerAsyncId) {
    const scope = scopes.get(triggerAsyncId);
    if (scope) scopes.set(asyncId, scope);
  },
  destroy(asyncId) {
    scopes.delete(asyncId);
  },
}).enable();

function bindScope(store: TenantStore) {
  scopes.set(executionAsyncId(), store);
}

export function boundTenant(): TenantStore | undefined {
  return tenantAls.getStore() ?? scopes.get(executionAsyncId());
}

export function withPlatformBypass<T>(fn: () => T): T {
  const store = { pharmacyId: null, slug: null, bypass: true };
  bindScope(store);
  enterRlsScope({ bypass: true, pharmacyId: null });
  return tenantAls.run(store, fn);
}

export function withPharmacy<T>(pharmacyId: string, fn: () => T, slug?: string | null): T {
  const store = { pharmacyId, slug: slug ?? null, bypass: false };
  bindScope(store);
  enterRlsScope({ bypass: false, pharmacyId });
  return tenantAls.run(store, fn);
}

export function failClosedId(): string {
  return ZERO_UUID;
}

export function peekTenant(): TenantStore | undefined {
  return boundTenant();
}
