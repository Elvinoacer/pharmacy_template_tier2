import type { SessionUser } from "@/app/lib/types";
import {
  membershipPermissions,
  type Permission,
} from "@/app/lib/platform/permissions";

type AdminAccessRule = {
  prefix: string;
  permissions?: readonly Permission[];
  exact?: boolean;
};

type AdminDynamicAccessRule = {
  pattern: RegExp;
  permissions: readonly Permission[];
};

/**
 * Admin information-architecture policy.
 *
 * The active pharmacy membership is authoritative. This mirrors the
 * permission vocabulary enforced by the server-side platform policy while
 * remaining safe to import from client navigation code.
 */
const ADMIN_ACCESS_RULES: readonly AdminAccessRule[] = [
  { prefix: "/admin", exact: true },
  { prefix: "/admin/select" },

  { prefix: "/admin/settings/integrations", permissions: ["integrations.manage"] },
  { prefix: "/admin/settings/storefront", permissions: ["settings.manage"] },
  { prefix: "/admin/settings/location", permissions: ["settings.manage"] },
  { prefix: "/admin/setup", permissions: ["settings.manage"] },
  { prefix: "/admin/knowledge", permissions: ["settings.manage"] },

  { prefix: "/admin/analytics", permissions: ["reports.view"] },

  { prefix: "/admin/campaigns", permissions: ["campaigns.create"] },
  { prefix: "/admin/reminders", permissions: ["campaigns.create"] },
  { prefix: "/admin/segments", permissions: ["campaigns.create"] },
  { prefix: "/admin/templates", permissions: ["campaigns.create"] },
  { prefix: "/admin/loyalty", permissions: ["campaigns.create"] },

  { prefix: "/admin/messages", permissions: ["customers.write"] },
  { prefix: "/admin/enquiries", permissions: ["customers.write"] },
  { prefix: "/admin/feedback", permissions: ["customers.write"] },
  { prefix: "/admin/inbox", permissions: ["customers.read"] },
  { prefix: "/admin/notifications", permissions: ["customers.read"] },

  { prefix: "/admin/services/bookings", permissions: ["prescriptions.read"] },
  { prefix: "/admin/services", permissions: ["settings.manage"] },
  { prefix: "/admin/screenings", permissions: ["prescriptions.read"] },
  { prefix: "/admin/vaccinations", permissions: ["prescriptions.read"] },
  { prefix: "/admin/adherence", permissions: ["prescriptions.read"] },
  { prefix: "/admin/feel", permissions: ["prescriptions.read"] },
  { prefix: "/admin/ai", permissions: ["prescriptions.read"] },

  { prefix: "/admin/prescriptions/new", permissions: ["prescriptions.dispense"] },
  { prefix: "/admin/prescriptions", permissions: ["prescriptions.read"] },
  { prefix: "/admin/refills", permissions: ["prescriptions.read"] },
  { prefix: "/admin/dispensing", permissions: ["prescriptions.read"] },

  { prefix: "/admin/medications/import", permissions: ["inventory.write"] },
  { prefix: "/admin/medications/categories", permissions: ["inventory.write"] },
  { prefix: "/admin/medications/incomplete", permissions: ["inventory.write"] },
  { prefix: "/admin/medications/library", permissions: ["inventory.write"] },
  { prefix: "/admin/medications/scan", permissions: ["inventory.write"] },
  { prefix: "/admin/medications/add", permissions: ["inventory.write"] },
  { prefix: "/admin/medications/new", permissions: ["inventory.write"] },
  { prefix: "/admin/medications/metrics", permissions: ["reports.view"] },
  { prefix: "/admin/medications", permissions: ["inventory.read"] },
  { prefix: "/admin/inventory", permissions: ["inventory.read"] },

  { prefix: "/admin/orders", permissions: ["orders.read"] },
  { prefix: "/admin/customers", permissions: ["customers.read"] },
];

const ADMIN_DYNAMIC_ACCESS_RULES: readonly AdminDynamicAccessRule[] = [
  // The medication ID route is an edit + inventory-operations workspace, not
  // a read-only detail view, so it must not inherit the catalogue read grant.
  { pattern: /^\/admin\/medications\/[^/]+$/, permissions: ["inventory.write"] },
];

function ruleMatches(rule: AdminAccessRule, pathname: string): boolean {
  if (rule.exact) return pathname === rule.prefix;
  return pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`);
}

function activeMembership(user: SessionUser) {
  return (
    user.memberships.find(
      (membership) =>
        membership.status === "active" &&
        membership.pharmacyId === user.activePharmacyId,
    ) ?? user.memberships.find((membership) => membership.status === "active")
  );
}

export function canAccessAdminPath(user: SessionUser, pathname: string): boolean {
  if (user.platformAdmin) return true;

  const membership = activeMembership(user);
  if (!membership) return false;

  const granted = membershipPermissions(membership.role, []);
  const dynamicRule = ADMIN_DYNAMIC_ACCESS_RULES.find((candidate) =>
    candidate.pattern.test(pathname),
  );
  if (dynamicRule) {
    return dynamicRule.permissions.some((permission) => granted.has(permission));
  }

  const rule = ADMIN_ACCESS_RULES.filter((candidate) =>
    ruleMatches(candidate, pathname),
  ).sort((a, b) => b.prefix.length - a.prefix.length)[0];

  // New admin surfaces are denied until their permission model is declared.
  if (!rule) return false;
  if (!rule.permissions?.length) return true;

  return rule.permissions.some((permission) => granted.has(permission));
}
