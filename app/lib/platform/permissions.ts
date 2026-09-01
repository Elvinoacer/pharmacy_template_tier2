export const PERMISSIONS = [
  "customers.read",
  "customers.write",
  "orders.read",
  "orders.create",
  "orders.refund",
  "inventory.read",
  "inventory.write",
  "inventory.adjust",
  "prescriptions.read",
  "prescriptions.dispense",
  "payments.collect",
  "payments.refund",
  "payments.void",
  "campaigns.create",
  "campaigns.send",
  "reports.view",
  "settings.manage",
  "integrations.manage",
  "staff.invite",
  "staff.remove",
  "billing.manage",
  "branches.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  owner: ALL,
  manager: ALL.filter((p) => p !== "staff.remove"),
  pharmacist: [
    "customers.read",
    "customers.write",
    "orders.read",
    "orders.create",
    "inventory.read",
    "prescriptions.read",
    "prescriptions.dispense",
    "payments.collect",
    "reports.view",
  ],
  staff: [
    "customers.read",
    "orders.read",
    "orders.create",
    "inventory.read",
    "payments.collect",
  ],
};

export const PLATFORM_ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ["*"],
  super_admin: ["*"],
  billing_admin: ["billing.*", "tenants.read", "invoices.*", "plans.*"],
  support: ["tenants.read", "support.impersonate", "jobs.read", "audit.read"],
  security: ["users.*", "sessions.*", "mfa.*", "audit.read", "security.*"],
  operator: ["jobs.*", "webhooks.*", "integrations.read", "notifications.*"],
  auditor: ["audit.read", "tenants.read", "reports.view"],
  none: [],
};

export function roleHasPermission(role: string, permission: Permission): boolean {
  const granted = ROLE_PERMISSIONS[role] ?? [];
  return granted.includes(permission);
}

export function membershipPermissions(
  role: string,
  extra: string[] | null | undefined,
): Set<string> {
  const set = new Set<string>(ROLE_PERMISSIONS[role] ?? []);
  for (const p of extra ?? []) set.add(p);
  return set;
}

/** Owner is the only implicit bypass. super_admin must be listed on the action. */
export function platformRoleAllowed(role: string, roles: string[]): boolean {
  return roles.includes("*") || roles.includes(role) || role === "owner";
}
