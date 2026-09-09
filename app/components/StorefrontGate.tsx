import type { ReactNode } from "react";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import StorefrontUnavailable from "@/app/components/StorefrontUnavailable";
import {
  getStorefrontView,
  type StorefrontView,
} from "@/app/lib/services/storefront-content";
import {
  getResolvedPharmacyOrNull,
  type ResolvedPharmacy,
} from "@/app/lib/services/pharmacy-settings";

/**
 * Server helper + visual gate for shop-action pages.
 *
 * `getStorefrontView()` distinguishes three cases:
 *   - "active"      → render the room (`children(pharmacy)`).
 *   - "unavailable" → an explicit /p/{slug} was requested but nothing live
 *                     answers to it — show a kind "not available" state
 *                     instead of pretending this is a chooser moment.
 *   - "none"        → network-page context without an explicit tenant.
 */
export function loadStorefrontView(): Promise<StorefrontView> {
  return getStorefrontView();
}

/**
 * Lightweight tenant resolver for transactional/catalogue pages.
 *
 * These pages only need the resolved pharmacy identity/settings before they
 * query their own domain data. Building the entire storefront document here
 * caused an unnecessary second PharmacySettings read plus template merge on
 * every medicines/services/refill/etc request. Keep the richer
 * `getStorefrontView()` path for pages that actually render storefront content.
 */
export function loadStorefront(): Promise<ResolvedPharmacy | null> {
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
  const view = await getStorefrontView();
  if (view.status === "active") {
    return <>{children(view.resolved)}</>;
  }
  if (view.status === "unavailable") {
    return <StorefrontUnavailable slug={view.slug} next={next} />;
  }
  return <ChoosePharmacy next={next} title={title} description={description} />;
}
