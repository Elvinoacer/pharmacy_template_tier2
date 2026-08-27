import "server-only";

import { headers } from "next/headers";

/**
 * Resolve the canonical app base URL.
 *
 * Order of preference:
 * 1. NEXT_PUBLIC_APP_URL env var (most reliable in serverless / reverse proxy).
 * 2. x-forwarded-* headers from the inbound request.
 * 3. request.url (last resort, may be localhost:port in dev).
 *
 * Why this matters: Google OAuth redirect URIs must match exactly what is
 * registered in the Google Cloud Console. Using `request.url`'s origin
 * breaks when deployed behind a proxy that terminates TLS on a different host.
 */
export function appBaseUrl(request: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (env) return env;

  // Try forwarded headers (Vercel, nginx, Cloudflare, etc.).
  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (proto && host) {
    return `${proto}://${host}`;
  }

  // Fallback to request URL origin.
  return new URL(request.url).origin;
}

/** Inbound request metadata (IP + UA) for audit logs and rate limiting. */
export async function getRequestMeta() {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: forwardedFor || h.get("x-real-ip") || "unknown",
    userAgent: h.get("user-agent") || undefined,
  };
}
