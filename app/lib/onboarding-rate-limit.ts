import { createHash } from "node:crypto";

export type OnboardingRateLimitIdentity = {
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
};

function normalizeIp(ip?: string | null): string | null {
  const value = ip?.trim();
  if (!value || value.toLowerCase() === "unknown") return null;
  return value;
}

function emailFingerprint(email: string): string {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 24);
}

/**
 * Build privacy-conscious onboarding rate-limit keys.
 *
 * The principal bucket prevents one account/email from spamming registrations.
 * The IP bucket is deliberately separate and should be used only as a broad
 * abuse ceiling so people behind shared Wi-Fi/mobile carrier NAT do not block
 * each other during normal onboarding.
 *
 * Unknown IPs are omitted entirely; they must never collapse unrelated users
 * into one global "unknown" bucket.
 */
export function buildOnboardingRateLimitKeys(identity: OnboardingRateLimitIdentity): {
  principalKey: string | null;
  ipKey: string | null;
} {
  const userId = identity.userId?.trim();
  const email = identity.email?.trim();
  const ip = normalizeIp(identity.ip);

  const principalKey = userId
    ? `onboard-draft:user:${userId}`
    : email
      ? `onboard-draft:email:${emailFingerprint(email)}`
      : ip
        ? `onboard-draft:ip:${ip}`
        : null;

  return {
    principalKey,
    ipKey: ip ? `onboard-draft:ip:${ip}` : null,
  };
}
