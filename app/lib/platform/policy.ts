import "server-only";

import { AuthError, requirePlatformAdmin } from "@/app/lib/auth";
import type { SessionUser } from "@/app/lib/types";
import { getTenant } from "@/app/lib/tenant";
import { membershipPermissions, type Permission } from "@/app/lib/platform/permissions";
import { isFeatureEnabled } from "@/app/lib/platform/entitlements";

export type AuthorizeInput = {
  actor: SessionUser | null;
  action: Permission | string;
  resource?: string;
  tenantId?: string | null;
  branchId?: string | null;
};

export async function authorize(input: AuthorizeInput): Promise<SessionUser> {
  const actor = input.actor;
  if (!actor) throw new AuthError("Authentication required", 401);

  if (actor.platformAdmin) return actor;

  const tenantId = input.tenantId ?? (await getTenant().catch(() => ({ pharmacyId: null }))).pharmacyId;
  const membership = tenantId
    ? actor.memberships.find((m) => m.pharmacyId === tenantId && m.status === "active")
    : actor.memberships.find((m) => m.status === "active");

  if (!membership) throw new AuthError("No active membership for this pharmacy", 403);

  const granted = membershipPermissions(membership.role, []);
  if (!granted.has(input.action) && !granted.has("*")) {
    throw new AuthError(`Missing permission: ${input.action}`, 403);
  }

  return actor;
}

export async function requirePermission(
  user: SessionUser | null,
  permission: Permission,
): Promise<SessionUser> {
  return authorize({ actor: user, action: permission });
}

export async function requireEntitled(
  user: SessionUser | null,
  featureKey: string,
): Promise<SessionUser> {
  const actor = user;
  if (!actor) throw new AuthError("Authentication required", 401);
  const tenant = await getTenant();
  if (!tenant.pharmacyId && !actor.platformAdmin) {
    throw new AuthError("Tenant required", 403);
  }
  if (tenant.pharmacyId) {
    const ok = await isFeatureEnabled(tenant.pharmacyId, featureKey);
    if (!ok) throw new AuthError(`Plan does not include ${featureKey}`, 402);
  }
  return actor;
}

export function requirePlatformRole(
  user: SessionUser | null,
  roles: string[],
): SessionUser {
  const admin = requirePlatformAdmin(user);
  const role = (admin as SessionUser & { platformRole?: string }).platformRole || "super_admin";
  if (roles.includes("*") || roles.includes(role) || role === "owner" || role === "super_admin") {
    return admin;
  }
  throw new AuthError("Insufficient platform role", 403);
}
