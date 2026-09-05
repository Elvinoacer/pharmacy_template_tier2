import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_VERSION = 1;
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

type RefillTrackingClaims = {
  v: number;
  refillId: string;
  pharmacyId: string;
  exp: number;
};

function secret(): string | null {
  const dedicated = process.env.REFILL_TRACKING_SECRET?.trim();
  if (dedicated) return dedicated;
  if (process.env.NODE_ENV === "production") return null;
  return process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function createRefillTrackingToken(
  refillId: string,
  pharmacyId: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): string | null {
  const key = secret();
  if (!key) return null;
  const claims: RefillTrackingClaims = {
    v: TOKEN_VERSION,
    refillId,
    pharmacyId,
    exp: Math.floor(Date.now() / 1000) + Math.max(300, Math.min(DEFAULT_TTL_SECONDS, ttlSeconds)),
  };
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

export function verifyRefillTrackingToken(token: string): RefillTrackingClaims | null {
  const key = secret();
  if (!key) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload, key);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<RefillTrackingClaims>;
    if (
      claims.v !== TOKEN_VERSION ||
      typeof claims.refillId !== "string" ||
      typeof claims.pharmacyId !== "string" ||
      typeof claims.exp !== "number" ||
      claims.exp < Math.floor(Date.now() / 1000)
    ) return null;
    if (!/^[0-9a-f-]{36}$/i.test(claims.refillId) || !/^[0-9a-f-]{36}$/i.test(claims.pharmacyId)) return null;
    return claims as RefillTrackingClaims;
  } catch {
    return null;
  }
}
