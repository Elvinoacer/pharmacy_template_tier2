import "server-only";

import { AuthError, requirePlatformAdmin } from "@/app/lib/auth";
import type { SessionUser } from "@/app/lib/types";
import { getTenant } from "@/app/lib/tenant";
import { membershipPermissions, type Permission } from "@/app/lib/platform/permissions";
import { isFeatureEnabled } from "@/app/lib/platform/entitlements";
import { prismaUnscoped } from "@/app/lib/db";

const MUTATING = new Set([
  "customers.write",
  "orders.create",
  "orders.refund",
  "inventory.write",
  "inventory.adjust",
  "prescriptions.dispense",
  "payments.collect",
  "payments.refund",
  "payments.void",
  "campaigns.create",
  "campaigns.send",
  "settings.manage",
  "integrations.manage",
  "staff.invite",
  "staff.remove",
  "billing.manage",
  "branches.manage",
]);

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

  const { activeSupportSession, supportIsReadOnly } = await import(
    "@/app/lib/platform/support-session"
  );
  const support = await activeSupportSession();
  if (supportIsReadOnly(support) && MUTATING.has(String(input.action))) {
    throw new AuthError("This support session is read-only", 403);
  }

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

const POWER_ROLES = new Set(["owner", "super_admin"]);

export function effectivePlatformRole(user: SessionUser): string {
  if (user.platformRole && user.platformRole !== "none") return user.platformRole;
  if (user.platformAdmin) return "super_admin";
  return "none";
}

export function requirePlatformRole(
  user: SessionUser | null,
  roles: string[],
): SessionUser {
  const admin = requirePlatformAdmin(user);
  const role = effectivePlatformRole(admin);
  if (roles.includes("*") || roles.includes(role) || POWER_ROLES.has(role)) {
    return admin;
  }
  throw new AuthError("Insufficient platform role", 403);
}

const STEP_UP_MS = 10 * 60 * 1000;

export async function requireStepUp(user: SessionUser, maxAgeMs = STEP_UP_MS): Promise<SessionUser> {
  const row = await prismaUnscoped.user.findUnique({
    where: { id: user.id },
    select: { lastReauthAt: true, twoFactorEnabled: true, platformAdmin: true },
  });
  if (!row) throw new AuthError("Authentication required", 401);
  if ((row.platformAdmin || user.platformAdmin) && !row.twoFactorEnabled && !user.twoFactorEnabled) {
    throw new AuthError("MFA_REQUIRED", 401);
  }
  const at = row.lastReauthAt ?? user.lastReauthAt;
  if (!at || Date.now() - at.getTime() > maxAgeMs) {
    throw new AuthError("STEP_UP_REQUIRED", 401);
  }
  return user;
}

export async function requirePlatformAction(
  roles: string[],
  opts?: { stepUp?: boolean },
): Promise<SessionUser> {
  const { getSessionUser } = await import("@/app/lib/auth");
  const user = requirePlatformRole(await getSessionUser(), roles);
  if (opts?.stepUp !== false) await requireStepUp(user);
  return user;
}
