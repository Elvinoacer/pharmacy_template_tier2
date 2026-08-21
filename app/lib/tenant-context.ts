import { AsyncLocalStorage } from "node:async_hooks";

export const STAFF_PHARMACY_COOKIE = "aether_staff_pharmacy";
export const PUBLIC_PHARMACY_COOKIE = "aether_pharmacy";

export const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

export type TenantStore = {
  pharmacyId: string | null;
  slug: string | null;
  bypass: boolean;
};

export const tenantAls = new AsyncLocalStorage<TenantStore>();

export function withPlatformBypass<T>(fn: () => T): T {
  return tenantAls.run({ pharmacyId: null, slug: null, bypass: true }, fn);
}

export function withPharmacy<T>(pharmacyId: string, fn: () => T, slug?: string | null): T {
  return tenantAls.run({ pharmacyId, slug: slug ?? null, bypass: false }, fn);
}

export function failClosedId(): string {
  return ZERO_UUID;
}

export function peekTenant(): TenantStore | undefined {
  return tenantAls.getStore();
}
