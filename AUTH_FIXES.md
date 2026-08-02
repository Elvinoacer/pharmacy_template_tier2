# Authentication Fixes — 2026-08-02

End-to-end audit and fix of the auth flow (Google OAuth, password login, account
creation) against Next.js 16 + React 19 Server Actions norms.

## Root causes

### 1. `redirect()` swallowed by `try/catch` in `loginAction` (CRITICAL)

`redirect()` from `next/navigation` works by throwing a `NEXT_REDIRECT` error
that Next.js catches at the Server Action boundary and converts into an HTTP
redirect response. The original `loginAction` wrapped all `redirect()` calls
in a `try/catch`:

```ts
try {
  const user = await loginWithPassword(email, password);
  if (isStaff(user.role)) redirect("/admin");   // throws NEXT_REDIRECT
  redirect("/portal");                            // throws NEXT_REDIRECT
} catch (e) {
  if (e instanceof AuthError) return { error: e.message };
  console.error(e);                               // logs the redirect error
  return { error: "Login failed. Please try again." };  // user sees this
}
```

Result: every successful login produced a "Login failed. Please try again."
error message even though the session cookie was actually set. From the user's
perspective, login "did not work."

**Fix:** moved `redirect()` outside the try/catch, and added an
`isRedirectError()` re-throw guard inside the catch for safety.

### 2. Missing `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (CRITICAL)

Next.js 16 requires `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` to encrypt the
payloads of Server Actions that touch cookies/headers. Without it, Server
Actions in production fail with cryptic `InvalidServerActionRequestError` or
similar — meaning login, register, and password reset all break.

**Fix:**
- Added to `.env.example` with a clear comment.
- Added startup validation in `app/lib/ensure-env.ts` (imported eagerly from
  `app/layout.tsx`) that throws in dev and logs loudly in production when
  `AUTH_SECRET` or `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` is missing or too short.

### 3. Google OAuth callback issues (HIGH)

Three issues in `app/api/auth/google/callback/route.ts`:

a) **No `email_verified` check** — anyone could create a Google account with
   someone else's email (unverified) and use it to take over an existing
   Aether account.

b) **`redirect_uri` derived from `request.url`** — breaks behind reverse
   proxies / serverless platforms where the inbound host differs from the
   public URL registered in Google Cloud Console.

c) **User lookup only by `email`** — if a Google user changes their email
   on Google's side, the `googleId` link was lost.

**Fix:**
- Reject callbacks where `payload.email_verified !== true`.
- Use `NEXT_PUBLIC_APP_URL` (with forwarded-header fallback) via new
  `appBaseUrl()` helper in `app/lib/env.ts`.
- Look up users by `email OR googleId`.
- Use `findFirst` + a defensive duplicate-check inside
  `registerGoogleCustomer` to handle race conditions.

### 4. `proxy.ts` doing a DB lookup on every page load (MEDIUM)

The proxy (Next.js 16's renamed middleware) called `getSessionUserByToken()`
on every navigation to `/portal` or `/admin`. This added latency and could
fail when the DB was briefly unreachable.

The `app/lib/session-claim.ts` module already existed with `signSessionClaim`
and `verifySessionClaim` helpers, but was never wired up.

**Fix:**
- `createSession()` now signs and sets a `aether_session_claim` JWT cookie
  alongside the opaque `aether_session` cookie.
- `proxy.ts` verifies the JWT claim for a fast DB-free check. If the JWT is
  missing or invalid but the session cookie exists, it falls through and lets
  the layout's `getSessionUser()` do the authoritative DB lookup.
- `destroySession()` clears both cookies.

### 5. Minor improvements

- `app/lib/auth.ts`: `getSessionUserByToken` now swallows the rare
  "session already deleted" error on expiry cleanup.
- `app/lib/auth.ts`: `destroySession` swallows DB errors (best-effort
  cleanup; cookie is cleared regardless).
- Google OAuth start route: `prompt: 'select_account'` so users can pick
  which Google account to use; `access_type: 'online'` (we don't need
  refresh tokens for sign-in).
- README + `.env.example` now document Google OAuth setup with the exact
  redirect URI to register in Google Cloud Console.

## Files changed

| File | Change |
| --- | --- |
| `app/actions/auth.ts` | Fixed `redirect()` swallowed by try/catch in `loginAction` and `registerAction`. Added `isRedirectError` re-throw. Used `resolvePostLoginPath` helper for staff/customer routing. |
| `app/lib/auth.ts` | Wired up JWT session-claim cookie in `createSession`/`destroySession`. Added `assertAuthSecretConfigured()`. Hardened error handling. |
| `app/lib/env.ts` | **New.** `appBaseUrl()` resolves canonical app URL from `NEXT_PUBLIC_APP_URL` or forwarded headers. `getRequestMeta()` extracted here. |
| `app/lib/request-meta.ts` | Re-exports `getRequestMeta` from `app/lib/env.ts` (back-compat). |
| `app/lib/ensure-env.ts` | **New.** Startup validation for `DATABASE_URL`, `AUTH_SECRET`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`. |
| `app/layout.tsx` | Calls `ensureEnvConfigured()` eagerly so missing env vars surface at startup, not at first sign-in. |
| `app/api/auth/google/route.ts` | Uses `appBaseUrl()`. `prompt: select_account`, `access_type: online`. |
| `app/api/auth/google/callback/route.ts` | `email_verified` check, `email OR googleId` lookup, `appBaseUrl()`, structured error redirects, IP/UA on session creation. |
| `proxy.ts` | JWT fast-path auth check via `verifySessionClaim`. Falls back to layout's DB lookup. No more Prisma call per page navigation. |
| `.env.example` | Added `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`. Documented each var. |
| `README.md` | Added Google OAuth setup section + env var table with required/optional flags. |

## Verification

```bash
npm install              # postinstall runs prisma generate
npx tsc --noEmit         # ✓ passes
npx next build           # ✓ 79 routes, 0 errors
```

## Post-deploy checklist

1. Generate secrets: `openssl rand -base64 32` for `AUTH_SECRET` and
   `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`.
2. Set `NEXT_PUBLIC_APP_URL` to your exact production URL (incl. `https`).
3. Create Google OAuth credentials and add the redirect URI
   `<NEXT_PUBLIC_APP_URL>/api/auth/google/callback` to the authorized list.
4. Run `npm run db:migrate` and `npm run db:seed` to create tables + demo users.
5. Restart the app and verify login with `jane@example.com` / `Password123!`.
