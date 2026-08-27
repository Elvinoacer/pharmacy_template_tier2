"use client";

import { createContext, useContext } from "react";

export type PortalPharmacy = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  logoUrl: string | null;
};

const PortalPharmaciesContext = createContext<PortalPharmacy[]>([]);

export function PortalPharmaciesProvider({
  pharmacies,
  children,
}: {
  pharmacies: PortalPharmacy[];
  children: React.ReactNode;
}) {
  return (
    <PortalPharmaciesContext.Provider value={pharmacies}>
      {children}
    </PortalPharmaciesContext.Provider>
  );
}

export function usePortalPharmacies(): PortalPharmacy[] {
  return useContext(PortalPharmaciesContext);
}
