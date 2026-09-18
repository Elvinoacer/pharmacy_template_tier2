# Afyvia — Pharmacy Network (multi-tenant)

Tier 1 is the public digital presence. **Tier 2** adds the pharmacy’s **digital relationship manager**: customer accounts, CRM, communication, AI self-service, refill workflows, reminders, campaigns, loyalty, and analytics.

This build is a **multi-tenant network**: many independent pharmacies share the platform. Read **[MULTITENANCY.md](./MULTITENANCY.md)** before changing schema or auth.

Built with **Next.js 16**, **Prisma 7**, and **Neon Postgres**.

## Stack

| Layer | Technology |
| --- | --- |
| App | Next.js App Router, React 19, Tailwind CSS 4 |
| ORM | Prisma 7 (`prisma-client` + `@prisma/adapter-pg`) |
| Database | Neon Postgres (shared DB, `pharmacy_id` isolation) |
| Auth | Cookie sessions, bcrypt password hashes, memberships + platform admin |
| AI | Groq (knowledge-base grounded assistant) |

## Modules (Tier 2)

1. Customer accounts (register / login / password reset)
2. Customer portal dashboard (one account, many pharmacies)
3. CRM profiles, notes, and timeline
4. Segmentation
5. Communication center (email / SMS / WhatsApp / portal threads)
6. AI virtual assistant (approved knowledge only)
7. AI-assisted refill requests
8. Refill management pipeline
9. Reminder engine
10. Campaign management
11. Loyalty (points, tiers, coupons, referrals — **per pharmacy**)
12. Online enquiries
13. Customer feedback
14. AI knowledge base
15. Notification center
16. Customer preferences & consent
17. Analytics dashboard
18. CRM administration
19. **Pharmacy onboarding** (`/onboard`) and **super-admin** (`/platform`)

## Quick start

```bash
npm install
cp .env.example .env.local   # or use existing .env / .env.local
npm run db:generate
npm run db:migrate           # prisma migrate deploy
npm run db:test              # verify DATABASE_URL (+ optional HOSTADDR)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For role-specific navigation and safe admin provisioning, see [Everyday user flows](docs/USER_FLOWS.md). The demo seed (`npm run db:seed`) truncates existing data; use it only on a disposable demo database. Use `npm run db:seed:admin` to add one platform admin without resetting pharmacy data.

### Environment

Copy `.env.example` to `.env.local` and fill in real values:

```bash
cp .env.example .env.local
# Generate secrets:
openssl rand -base64 32  # → AUTH_SECRET
openssl rand -base64 32  # → NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
openssl rand -hex 32     # → CRON_SECRET
```

**Platform env** (database, auth, Groq, R2, Google, Firebase) is shared. **Per-pharmacy** Daraja / Twilio / WhatsApp / POS / timezone live in `pharmacy_integrations` (admin settings), not extra env files.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string (`sslmode=require`) — **required** |
| `DIRECT_URL` | Same as `DATABASE_URL`, used by Prisma CLI for migrations |
| `DATABASE_HOSTADDR` | Optional IPv4 override when Node cannot connect through DNS |
| `AUTH_SECRET` | Signs the session-claim JWT cookie. ≥16 chars. **Required.** |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Required by Next.js 16 to encrypt Server Action payloads. ≥16 chars. **Required.** |
| `NEXT_PUBLIC_APP_URL` | Public app URL — used for OAuth redirect URI, email links. Must match your production domain exactly. |
| `CRON_SECRET` | Bearer token for `/api/cron/reminders` (required in production) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (Google Cloud Console → Credentials) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GROQ_API_KEY` | AI assistant |
| `GROQ_MODEL` | Optional text model override. Default `openai/gpt-oss-20b` (Llama 3.x IDs were shut down 16 Aug 2026). |
| `GROQ_VISION_MODEL` | Optional vision model override. Default `qwen/qwen3.8-27b` (`qwen/qwen3.6-27b` was retired). |

#### Google OAuth setup

1. Go to **[Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)**.
2. Create an **OAuth client ID** (type: *Web application*).
3. Under **Authorized redirect URIs**, add:
   - Dev: `http://localhost:3000/api/auth/google/callback`
   - Prod: `https://YOUR_DOMAIN/api/auth/google/callback`
4. Copy the **Client ID** and **Client Secret** into `.env.local` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
5. Make sure `NEXT_PUBLIC_APP_URL` matches the host used in the redirect URI exactly (incl. `https`).

The callback verifies the Google ID token, checks that `email_verified` is true, then either signs the user in (if their email matches an existing account) or creates a new customer account linked to their Google ID.

### Scheduled jobs (Cron Endpoints)

Reminders are processed every 5 minutes by calling the deployed `/api/cron/reminders` endpoint via GET/POST with authorization (`Bearer CRON_SECRET` header or `?secret=CRON_SECRET` query parameter). Cron handlers run inside `withPlatformBypass` so they iterate every tenant.

| Endpoint | Frequency | Function |
| --- | --- | --- |
| `/api/cron/reminders` | Every 5 mins | Dose reminders, scheduled campaigns, messages & adherence alerts |
| `/api/cron/inventory` | Every 6 hours | Inventory low stock & expiration monitoring |
| `/api/cron/loyalty` | Daily (06:00 UTC) | Birthday points, refill completion bonuses & order points |

### Demo accounts

Password for all: **`Password123!`**

| Email | Role | Entry |
| --- | --- | --- |
| `platform@afyvia.health` | Super-admin | `/platform` |
| `manager@afyviapharmacy.com` | Afyvia owner + Coast Care manager | `/admin` (switcher) |
| `pharmacist@afyviapharmacy.com` | Pharmacist (Afyvia) | `/admin` |
| `staff@afyviapharmacy.com` | Staff (Afyvia) | `/admin` |
| `jane@example.com` | Customer (Afyvia + Coast Care) | `/portal` → My pharmacies |
| `john@example.com` | Customer (Afyvia) | `/portal` |
| `peter@example.com` | Caregiver | `/caregiver` |

Demo tenants: **Afyvia** (`/p/afyvia`, live), **Coast Care** (`/p/coast-care`, live), **Highlands** (submitted, in the verification queue).

## Key routes

### Platform

- `/` marketplace directory
- `/for-pharmacies` join pitch
- `/onboard` pharmacy application wizard
- `/platform` super-admin (verifications, list/suspend, impersonate)

### Public storefront (per pharmacy)

- `/p/{slug}` homepage, `/p/{slug}/medicines`, `/p/{slug}/refill`, `/p/{slug}/contact`, `/p/{slug}/delivery`, `/p/{slug}/careers`
- After visiting a storefront, un-prefixed `/medicines` etc. stay on that pharmacy via cookie

### Auth

- `/register`, `/login`, `/forgot-password`, `/reset-password`

### Customer portal

- `/portal` dashboard (scoped to the active pharmacy)
- `/portal/pharmacies` join / switch pharmacies
- `/portal/refills`, `/portal/prescriptions`, `/portal/caregivers`
- `/portal/messages`, `/portal/loyalty`, `/portal/preferences`
- `/portal/profile`, `/portal/feedback`

### Staff CRM

- `/admin` analytics (one pharmacy at a time)
- `/admin/select` switch tenant
- `/admin/setup` go-live checklist
- `/admin/customers`, `/admin/customers/[id]` (timeline, notes, messaging)
- `/admin/refills`, `/admin/enquiries`, `/admin/messages`
- `/admin/campaigns`, `/admin/segments`, `/admin/reminders`
- `/admin/notifications`, `/admin/loyalty`, `/admin/feedback`
- `/admin/knowledge`, `/admin/templates`
- `/admin/settings/location` public profile CMS

## Database (Prisma)

- Schema: `prisma/schema.prisma`
- Config: `prisma.config.ts` (Prisma 7)
- Client output: `app/generated/prisma`
- Client singleton: `app/lib/db/prisma.ts` (`@prisma/adapter-pg` + tenant extension)
- Migrations: `prisma/migrations` (includes `20260822010000_multi_tenancy`)

```bash
npm run db:generate         # prisma generate
npm run db:migrate          # prisma migrate deploy
npm run db:migrate:status   # migration status
npm run db:test             # connectivity smoke test
npm run db:seed             # demo data (3 pharmacies + platform admin)
npm run db:studio           # Prisma Studio
```

## AI safety

The assistant uses pharmacy facts plus **relevant approved** knowledge articles (matched per question — the full knowledge base is never dumped into the prompt). Live product availability uses secure tools against **public-listed** inventory only (coarse stock status, no internal fields). It must not diagnose, prescribe, change doses, or interpret labs. Uncertain or clinical questions are escalated to staff; conversations are stored for analytics.

## Out of scope (Tier 3)

Inventory, POS, suppliers, stock, dispensing workflow, barcode, accounting, payroll, warehouse — present in this template as modules, but not the multi-tenancy brief.

## Scripts

```bash
npm run dev
npm run build    # prisma generate && next build
npm run start
npm run lint
```
