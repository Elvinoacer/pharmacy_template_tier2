import "server-only";

import { cookies } from "next/headers";
import { randomBytes } from "crypto";

/**
 * CSRF protection for server actions using double-submit cookie pattern.
 * 
 * Usage:
 *   1. Call generateCsrfToken() when rendering forms
 *   2. Include token in form as hidden field or header
 *   3. Call validateCsrfToken(token) in server actions before processing
 */

const CSRF_COOKIE_NAME = "afyvia_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generate a cryptographically secure CSRF token.
 * Stores it in an HttpOnly cookie and returns it for form inclusion.
 */
export async function generateCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  
  if (existing && isValidTokenFormat(existing)) {
    return existing;
  }
  
  const token = randomBytes(32).toString("hex");
  const isSecure = process.env.NODE_ENV === "production";
  
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 2, // 2 hours
  });
  
  return token;
}

/**
 * Validate CSRF token from request.
 * Call this at the start of every mutating server action.
 * 
 * @throws {Error} If token is missing or invalid
 */
export async function validateCsrfToken(providedToken?: string): Promise<void> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  
  if (!providedToken || !cookieToken) {
    throw new Error("CSRF token missing");
  }
  
  if (!isValidTokenFormat(providedToken) || !isValidTokenFormat(cookieToken)) {
    throw new Error("CSRF token invalid");
  }
  
  // Constant-time comparison to prevent timing attacks
  if (!constantTimeCompare(providedToken, cookieToken)) {
    throw new Error("CSRF token mismatch");
  }
}

/**
 * Extract CSRF token from request headers (for API routes).
 */
export function getCsrfTokenFromHeader(headers: Headers): string | null {
  return headers.get(CSRF_HEADER_NAME);
}

/**
 * Validate CSRF token for API routes.
 */
export function validateCsrfTokenForApi(
  providedToken: string | null,
  cookieToken: string | null
): boolean {
  if (!providedToken || !cookieToken) return false;
  if (!isValidTokenFormat(providedToken) || !isValidTokenFormat(cookieToken)) return false;
  return constantTimeCompare(providedToken, cookieToken);
}

/**
 * Basic format validation - should be 64 hex chars
 */
function isValidTokenFormat(token: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(token);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Clear CSRF token (e.g., on logout)
 */
export async function clearCsrfToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CSRF_COOKIE_NAME);
}
