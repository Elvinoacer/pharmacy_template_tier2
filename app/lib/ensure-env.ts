import "server-only";

import { assertAuthSecretConfigured } from "@/app/lib/auth";

/**
 * Validate required environment variables at app startup.
 *
 * In Next.js 16, env vars are not validated automatically — missing values
 * surface as confusing runtime errors at the first request. This module
 * is imported eagerly by app/layout.tsx so the app fails fast in dev
 * (and on `next build`) rather than at user sign-in time.
 *
 * In production we log a warning but do not throw, so a misconfigured
 * deployment can still serve marketing pages — auth simply will not work
 * until the secret is added.
 */
let validated = false;

export function ensureEnvConfigured(): void {
  if (validated) return;
  validated = true;

  const required: Array<{ name: string; value?: string; minLen?: number }> = [
    { name: "DATABASE_URL", value: process.env.DATABASE_URL, minLen: 20 },
    { name: "AUTH_SECRET", value: process.env.AUTH_SECRET, minLen: 16 },
    {
      name: "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY",
      value: process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY,
      minLen: 16,
    },
  ];

  const missing = required.filter(
    (v) => !v.value || v.value.trim().length < (v.minLen ?? 1),
  );

  if (missing.length > 0) {
    const names = missing.map((m) => m.name).join(", ");
    const msg = `[env] Missing or too-short env vars: ${names}. Update .env.local.`;
    if (process.env.NODE_ENV === "production") {
      console.error(msg);
    } else {
      // Fail fast in dev so the developer fixes it immediately.
      console.error(msg);
      throw new Error(msg);
    }
  }

  // Also validate AUTH_SECRET shape for JWT signing.
  try {
    assertAuthSecretConfigured();
  } catch (e) {
    if (process.env.NODE_ENV !== "production") throw e;
    console.error(String(e));
  }
}
