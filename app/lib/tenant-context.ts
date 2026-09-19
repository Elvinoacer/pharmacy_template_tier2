import { AsyncLocalStorage } from "node:async_hooks";
export const STAFF_PHARMACY_COOKIE = "afyvia_staff_pharmacy";
export const PUBLIC_PHARMACY_COOKIE = "afyvia_pharmacy";

export const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

export type TenantStore = {
  pharmacyId: string | null;
  slug: string | null;
  bypass: boolean;
};

const globalTenant = globalThis as unknown as {
  __afyvia_tenant_als?: AsyncLocalStorage<TenantStore>;
};

export const tenantAls: AsyncLocalStorage<TenantStore> =
  globalTenant.__afyvia_tenant_als ??
  (globalTenant.__afyvia_tenant_als = new AsyncLocalStorage<TenantStore>());

export function boundTenant(): TenantStore | undefined {
  return tenantAls.getStore();
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if (value === null || value === undefined) return false;
  if (typeof value !== "object" && typeof value !== "function") return false;
  return typeof (value as { then?: unknown }).then === "function";
}

function runScoped<T>(store: TenantStore, fn: () => T): T {
  return tenantAls.run(store, () => {
    const result = fn();

    // Prisma returns lazy thenables. Assimilate them while ALS is active so
    // the actual SQL and every descendant async operation inherit the intended
    // tenant/bypass context without leaking that context back to the caller.
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
