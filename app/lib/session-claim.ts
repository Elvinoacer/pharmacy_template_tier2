/**
 * Lightweight signed session claim for optimistic checks in `proxy.ts`.
 * Full authorization still happens via DB-backed sessions in `app/lib/auth.ts`.
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "aether_session";
export const SESSION_CLAIM_COOKIE = "aether_session_claim";

export type SessionClaim = {
  sub: string;
  role: string;
  customerId: string | null;
  platformAdmin: boolean;
  pharmacyId: string | null;
};

function getAuthSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionClaim(claim: SessionClaim, expiresAt: Date): Promise<string> {
  return new SignJWT({
    role: claim.role,
    customerId: claim.customerId,
    platformAdmin: claim.platformAdmin,
    pharmacyId: claim.pharmacyId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claim.sub)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getAuthSecretKey());
}

export async function verifySessionClaim(token: string | undefined | null): Promise<SessionClaim | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    if (!payload.sub || typeof payload.role !== "string") return null;
    return {
      sub: payload.sub,
      role: payload.role,
      customerId: typeof payload.customerId === "string" ? payload.customerId : null,
      platformAdmin: payload.platformAdmin === true,
      pharmacyId: typeof payload.pharmacyId === "string" ? payload.pharmacyId : null,
    };
  } catch {
    return null;
  }
}

/** Staff CRM roles — never granted via public registration or Google signup. */
export const STAFF_ROLE_SET = new Set(["pharmacist", "staff", "manager"]);

export function claimIsStaff(role: string): boolean {
  return STAFF_ROLE_SET.has(role);
}

export function isSafeInternalPath(path: string | null | undefined): path is string {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\"));
}

/**
 * Decide where a user lands after sign-in.
 * Platform admins → /platform, staff → /admin, caregivers → /caregiver, customers → /portal.
 */
export function resolvePostLoginPath(
  user: {
    role: string;
    customerId?: string | null;
    platformAdmin?: boolean;
  },
  next?: string | null,
): string {
  const staff = claimIsStaff(user.role);
  const isCaregiverRole = user.role === "caregiver";
  const safeNext = isSafeInternalPath(next) ? next : null;
  const platformAdmin = user.platformAdmin === true;

  if (safeNext) {
    if (safeNext.startsWith("/platform") && !platformAdmin) {
      return staff ? "/admin" : isCaregiverRole ? "/caregiver" : user.customerId ? "/portal" : "/login";
    }
    if (safeNext.startsWith("/admin") && !staff && !platformAdmin) {
      return isCaregiverRole ? "/caregiver" : user.customerId ? "/portal" : "/login";
    }
    if (safeNext.startsWith("/portal") && isCaregiverRole && !user.customerId) return "/caregiver";
    if (safeNext.startsWith("/portal") && staff && !user.customerId) return "/admin";
    return safeNext;
  }

  if (platformAdmin && !staff) return "/platform";
  if (platformAdmin && staff) return "/platform";
  if (staff) return "/admin";
  if (isCaregiverRole && !user.customerId) return "/caregiver";
  return "/portal";
}
