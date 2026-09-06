import "server-only";

/**
 * Cron authentication deliberately accepts secrets only via Authorization.
 * Query-string credentials leak into logs, analytics and copied URLs.
 */
export function isCronAuthorized(request: Request, envName = "CRON_SECRET"): boolean {
  const secret = process.env[envName]?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
