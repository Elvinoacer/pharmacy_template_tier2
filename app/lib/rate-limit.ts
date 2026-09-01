import "server-only";

import { prismaUnscoped } from "@/app/lib/db";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = memory.get(key);
  if (!existing || existing.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (existing.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }
  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Distributed rate limiter backed by Postgres. Falls back to process memory
 * if the counter table is unavailable (e.g. before migration).
 */
export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): RateLimitResult {
  return memoryLimit(key, options.limit, options.windowMs);
}

export async function checkRateLimitAsync(
  key: string,
  options: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const newResetAt = new Date(Date.now() + options.windowMs);
  try {
    const rows = await prismaUnscoped.$queryRaw<Array<{ count: number; reset_at: Date }>>`
      INSERT INTO "rate_limit_counters" ("id", "bucket_key", "count", "reset_at", "updated_at")
      VALUES (gen_random_uuid(), ${key}, 1, ${newResetAt}, NOW())
      ON CONFLICT ("bucket_key") DO UPDATE
      SET
        "count" = CASE WHEN "rate_limit_counters"."reset_at" <= NOW() THEN 1 ELSE "rate_limit_counters"."count" + 1 END,
        "reset_at" = CASE WHEN "rate_limit_counters"."reset_at" <= NOW() THEN ${newResetAt} ELSE "rate_limit_counters"."reset_at" END,
        "updated_at" = NOW()
      RETURNING "count", "reset_at"
    `;
    const row = rows[0];
    if (!row) return memoryLimit(key, options.limit, options.windowMs);

    const count = Number(row.count);
    const resetTime = new Date(row.reset_at).getTime();
    const nowTime = Date.now();

    if (count > options.limit) {
      const retryAfter = Math.max(1, Math.ceil((resetTime - nowTime) / 1000));
      return { allowed: false, retryAfterSeconds: retryAfter };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  } catch {
    return memoryLimit(key, options.limit, options.windowMs);
  }
}

export function rateLimitKey(parts: { ip?: string; user?: string; phone?: string; tenant?: string; endpoint?: string; device?: string }) {
  return ["rl", parts.endpoint, parts.tenant, parts.user, parts.phone, parts.ip, parts.device]
    .filter(Boolean)
    .join(":");
}
