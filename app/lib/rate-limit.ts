import "server-only";

import { prismaUnscoped } from "@/app/lib/db";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  /** True when the distributed store was unavailable and we degraded. */
  degraded?: boolean;
};

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = memory.get(key);
  if (!existing || existing.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0, degraded: true };
  }
  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
      degraded: true,
    };
  }
  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0, degraded: true };
}

/**
 * Process-local rate limiter. Prefer checkRateLimitAsync for anything
 * security-sensitive or multi-instance. Keep this only for non-critical UI paths.
 */
export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): RateLimitResult {
  return memoryLimit(key, options.limit, options.windowMs);
}

export type RateLimitAsyncOptions = {
  limit: number;
  windowMs: number;
  /**
   * When true (recommended for login, registration, password reset, payments,
   * MFA, OTP, guest order, AI/chat), a distributed-store failure rejects the
   * request instead of silently falling back to process-local memory.
   */
  failClosed?: boolean;
};

/**
 * Distributed rate limiter backed by Postgres.
 * - failClosed: false (default) → fall back to process memory on store failure
 * - failClosed: true → reject (allowed: false) when the store is unavailable
 */
export async function checkRateLimitAsync(
  key: string,
  options: RateLimitAsyncOptions,
): Promise<RateLimitResult> {
  const windowMs = Math.max(1, Math.floor(options.windowMs));
  try {
    const rows = await prismaUnscoped.$queryRaw<Array<{ count: number; reset_at: Date; server_now: Date }>>`
      INSERT INTO "rate_limit_counters" ("id", "bucket_key", "count", "reset_at", "updated_at")
      VALUES (gen_random_uuid(), ${key}, 1, (NOW() + ${windowMs} * INTERVAL '1 millisecond'), NOW())
      ON CONFLICT ("bucket_key") DO UPDATE
      SET
        "count" = CASE WHEN "rate_limit_counters"."reset_at" <= NOW() THEN 1 ELSE "rate_limit_counters"."count" + 1 END,
        "reset_at" = CASE WHEN "rate_limit_counters"."reset_at" <= NOW() THEN (NOW() + ${windowMs} * INTERVAL '1 millisecond') ELSE "rate_limit_counters"."reset_at" END,
        "updated_at" = NOW()
      RETURNING "count", "reset_at", NOW() AS server_now
    `;
    const row = rows[0];
    if (!row) {
      if (options.failClosed) {
        return { allowed: false, retryAfterSeconds: 30, degraded: true };
      }
      return memoryLimit(key, options.limit, options.windowMs);
    }

    const count = Number(row.count);
    const resetTime = new Date(row.reset_at).getTime();
    const nowTime = new Date(row.server_now).getTime();

    if (count > options.limit) {
      const retryAfter = Math.max(1, Math.ceil((resetTime - nowTime) / 1000));
      return { allowed: false, retryAfterSeconds: retryAfter };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  } catch {
    if (options.failClosed) {
      // Fail closed: do not silently downgrade security endpoints to per-process memory.
      return { allowed: false, retryAfterSeconds: 30, degraded: true };
    }
    return memoryLimit(key, options.limit, options.windowMs);
  }
}

export function rateLimitKey(parts: {
  ip?: string;
  user?: string;
  phone?: string;
  tenant?: string;
  endpoint?: string;
  device?: string;
}) {
  return ["rl", parts.endpoint, parts.tenant, parts.user, parts.phone, parts.ip, parts.device]
    .filter(Boolean)
    .join(":");
}
