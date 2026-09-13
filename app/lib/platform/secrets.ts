import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const CURRENT_PREFIX = "v2";
const LEGACY_PREFIX = "v1";

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function currentKeyMaterial(): Buffer {
  let secret = process.env.INTEGRATION_SECRET?.trim() || "";
  if (secret.length < 32 && process.env.NODE_ENV !== "production") {
    secret = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "";
  }
  if (secret.length < 32) {
    throw new Error(
      "INTEGRATION_SECRET (32+ chars) is required to encrypt integration credentials. Auth/session secrets are intentionally not reused.",
    );
  }
  return deriveKey(secret);
}

/**
 * Backward-compatible key reader for ciphertext written before key separation.
 * New ciphertext is NEVER written with AUTH_SECRET. This exists only so
 * operators can rotate/re-save existing integrations without downtime.
 */
function legacyKeyCandidates(): Buffer[] {
  const candidates = [
    process.env.INTEGRATION_SECRET?.trim(),
    process.env.AUTH_SECRET?.trim(),
    process.env.NEXTAUTH_SECRET?.trim(),
  ].filter((value): value is string => Boolean(value && value.length >= 16));
  return [...new Set(candidates)].map(deriveKey);
}

function decryptWithKey(payload: string, key: Buffer, expectedPrefix: string): string | null {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== expectedPrefix) return null;
  const [, ivB64, tagB64, dataB64] = parts;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final(),
    ]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", currentKeyMaterial(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [CURRENT_PREFIX, iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(":");
}

export function decryptSecret(payload: string | null | undefined): string | null {
  if (!payload) return null;

  if (payload.startsWith(`${CURRENT_PREFIX}:`)) {
    return decryptWithKey(payload, currentKeyMaterial(), CURRENT_PREFIX);
  }

  if (payload.startsWith(`${LEGACY_PREFIX}:`)) {
    for (const key of legacyKeyCandidates()) {
      const decrypted = decryptWithKey(payload, key, LEGACY_PREFIX);
      if (decrypted != null) return decrypted;
    }
    return null;
  }

  return null;
}

export function secretCipherVersion(payload: string | null | undefined): "v2" | "v1" | "unknown" {
  if (!payload) return "unknown";
  if (payload.startsWith(`${CURRENT_PREFIX}:`)) return "v2";
  if (payload.startsWith(`${LEGACY_PREFIX}:`)) return "v1";
  return "unknown";
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey(prefix = "aeth"): { raw: string; prefix: string; hash: string } {
  const body = randomBytes(24).toString("base64url");
  const raw = `${prefix}_${body}`;
  return { raw, prefix: raw.slice(0, 12), hash: hashApiKey(raw) };
}
