/**
 * Client-safe helpers for deciding which portal a signed-in user should open.
 * Mirrors resolvePostLoginPath defaults without depending on `next` overrides.
 */
import { claimIsStaff } from "@/app/lib/session-claim";

export type PortalSessionHint = {
  role: string;
  customerId?: string | null;
  fullName?: string | null;
  platformAdmin?: boolean;
};

export type PortalCta = {
  href: string;
  label: string;
  shortLabel: string;
  kind: "guest" | "customer" | "caregiver" | "admin";
};

/**
 * Resolve the default destination for a session.
 * - staff → /admin
 * - caregiver without a customer profile → /caregiver
 * - customer (and caregiver who also has a patient profile) → /portal
 * - guest → /login
 */
export function resolvePortalDestination(user: PortalSessionHint | null | undefined): string {
  if (!user) return "/login";
  if (user.platformAdmin) return "/platform";
  if (claimIsStaff(user.role)) return "/admin";
  if (user.role === "caregiver" && !user.customerId) return "/caregiver";
  return "/portal";
}

export function resolvePortalCta(user: PortalSessionHint | null | undefined): PortalCta {
  if (!user) {
    return {
      href: "/login",
      label: "Sign in",
      shortLabel: "Sign in",
      kind: "guest",
    };
  }

  if (user.platformAdmin) {
    return {
      href: "/platform",
      label: "Network console",
      shortLabel: "Network",
      kind: "admin",
    };
  }

  if (claimIsStaff(user.role)) {
    return {
      href: "/admin",
      label: "Admin portal",
      shortLabel: "Admin",
      kind: "admin",
    };
  }

  if (user.role === "caregiver" && !user.customerId) {
    return {
      href: "/caregiver",
      label: "Caregiver portal",
      shortLabel: "Caregiver",
      kind: "caregiver",
    };
  }

  return {
    href: "/portal",
    label: "My portal",
    shortLabel: "Portal",
    kind: "customer",
  };
}
