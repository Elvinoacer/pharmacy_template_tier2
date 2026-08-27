"use client";

import { createContext, useContext } from "react";
import { defaultTenantBrand, type TenantBrandValue } from "@/app/lib/brand";

const TenantBrandContext = createContext<TenantBrandValue>(defaultTenantBrand);

export function TenantBrandProvider({
  value,
  children,
}: {
  value: TenantBrandValue;
  children: React.ReactNode;
}) {
  return <TenantBrandContext.Provider value={value}>{children}</TenantBrandContext.Provider>;
}

export function useTenantBrand(): TenantBrandValue {
  return useContext(TenantBrandContext);
}
