import type { ReactNode } from "react";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import { getResolvedPharmacyOrNull, type ResolvedPharmacy } from "@/app/lib/services/pharmacy-settings";

/**
 * Server helper + visual gate. Shop pages call `loadStorefront()` and, if
 * null, render `<ChoosePharmacy next="…" />` instead of the old demo shop.
 */
export async function loadStorefront(): Promise<ResolvedPharmacy | null> {
  return getResolvedPharmacyOrNull();
}

export default async function StorefrontGate({
  next,
  title,
  description,
  children,
}: {
  next: string;
  title?: string;
  description?: string;
  children: (pharmacy: ResolvedPharmacy) => ReactNode;
}) {
  const pharmacy = await loadStorefront();
  if (!pharmacy) {
    return <ChoosePharmacy next={next} title={title} description={description} />;
  }
  return <>{children(pharmacy)}</>;
}
