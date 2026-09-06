# Everyday user flows

| Person | Start | Complete a task |
| --- | --- | --- |
| Public guest | `/` or `/pharmacies` | Choose a pharmacy, open its storefront, browse medicines and services. No account is needed to browse. |
| Customer | `/login` → `/portal` | Complete a profile, choose a pharmacy, then upload a prescription, request a refill, track orders, or message that pharmacy. |
| Pharmacist / staff | `/login` → `/admin` | Choose the staff pharmacy, review permitted queues, open a patient or prescription, and complete the relevant workflow. Daily task links respect membership permissions. |
| Platform admin | `/login` → `/platform/security` → `/platform` | Enroll an authenticator once, verify each new session, then review applications, manage pharmacies and users, or inspect operations. |

Account creation, Google sign-in, and customer profile setup preserve a safe internal return destination. Pharmacy records remain scoped to the selected pharmacy. Customer profiles and authentication audit events are network-wide.

## Local setup and updates

Use `git status` before updating a checkout. If it is clean and on `main`, run `git pull --ff-only origin main`. Preserve unfinished work before switching branches or updating.

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Open http://localhost:3000. The database used by local development is the one configured in `.env.local`; running locally does not automatically create an isolated database.

**Do not run `npm run db:seed` against a database you want to preserve.** It replaces demo data and truncates tables. To add a single administrator, set `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD` privately in the environment, then run:

```bash
npm run db:seed:admin
```

This command creates an admin or grants platform access to the specified active account. Existing passwords, memberships, and authenticators are preserved. New admins use the supplied password and enroll their own authenticator on first sign-in. Keep credentials out of commits and command history.

## Admin verification

1. Sign in using the administrator email and password.
2. Choose **Set up authenticator**. In your authenticator, add a time-based entry using the displayed setup key.
3. Save the eight recovery codes privately and confirm that you saved them.
4. Enter the current six-digit code and enable verification.
5. Continue to the platform overview. Each new session needs an authenticator or unused recovery code. Sensitive actions require verification within the last ten minutes; refresh it on the Security page.

Enrollment retries retain the setup information. Starting enrollment cannot reset an enabled authenticator. Recovery codes are consumed atomically, so two concurrent attempts cannot reuse one code.

## Validation

```bash
npm run typecheck
npm test
npm run build
npm run lint
```

The test runner uses the React server condition and runs files sequentially. Database tests run when `DATABASE_URL` is available. The MFA integration test creates and removes its own temporary user and leaves a labelled, append-only test audit event; it does not enroll real accounts or send messages.

Manual checks before a release should include guest pharmacy selection, customer registration/profile completion, prescription upload and review, refill completion, order/payment status, pharmacy switching, role-restricted links, and admin enrollment/sign-in on desktop and mobile. Payment-provider settlement and outbound messages need their configured providers and controlled test recipients.
