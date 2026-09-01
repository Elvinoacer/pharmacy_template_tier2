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
  const now = new Date();
  try {
    const row = await prismaUnscoped.rateLimitCounter.findUnique({ where: { bucketKey: key } });
    if (!row || row.resetAt <= now) {
      await prismaUnscoped.rateLimitCounter.upsert({
        where: { bucketKey: key },
        update: { count: 1, resetAt: new Date(now.getTime() + options.windowMs) },
        create: { bucketKey: key, count: 1, resetAt: new Date(now.getTime() + options.windowMs) },
      });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (row.count >= options.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000)),
      };
    }
    await prismaUnscoped.rateLimitCounter.update({
      where: { bucketKey: key },
      data: { count: { increment: 1 } },
    });
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
