import "server-only";

import { SignJWT, jwtVerify } from "jose";

export const LOCATION_HANDOFF_TTL_SECONDS = 10 * 60;
export const LOCATION_HANDOFF_AUDIENCE = "pharmacy-location-handoff";

type LocationHandoffClaim = {
  handoffId: string;
  pharmacyId: string;
  ownerUserId: string;
};

function getHandoffKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(`${secret}:location-handoff:v1`);
}

export async function signLocationHandoff(
  claim: LocationHandoffClaim,
  expiresAt: Date,
): Promise<string> {
  return new SignJWT({
    purpose: LOCATION_HANDOFF_AUDIENCE,
    pharmacyId: claim.pharmacyId,
    ownerUserId: claim.ownerUserId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(claim.handoffId)
    .setSubject(claim.pharmacyId)
    .setAudience(LOCATION_HANDOFF_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getHandoffKey());
}

export async function verifyLocationHandoff(
  token: string | null | undefined,
): Promise<LocationHandoffClaim | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getHandoffKey(), {
      audience: LOCATION_HANDOFF_AUDIENCE,
    });

    if (
      payload.purpose !== LOCATION_HANDOFF_AUDIENCE ||
      !payload.jti ||
      typeof payload.pharmacyId !== "string" ||
      typeof payload.ownerUserId !== "string" ||
      payload.sub !== payload.pharmacyId
    ) {
      return null;
    }

    return {
      handoffId: payload.jti,
      pharmacyId: payload.pharmacyId,
      ownerUserId: payload.ownerUserId,
    };
  } catch {
    return null;
  }
}
