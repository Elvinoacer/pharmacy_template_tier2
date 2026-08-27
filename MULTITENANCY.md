# Aether Pharmacy Network — multi-tenancy

Aether is a **pharmacy network**: many independent pharmacies share one platform,
one patient identity, and one super-admin console. Tenant data never mixes.

## Architecture

| Decision | Choice |
| --- | --- |
| Isolation | Shared Neon Postgres, `pharmacy_id` on every tenant table |
| Storefront URL | `/p/{slug}` (rewritten in `proxy.ts` to existing public routes) |
| Marketplace | `/` lists live, listed pharmacies |
| Pharmacy CRM | `/admin` — scoped to the staff cookie `aether_staff_pharmacy` |
| Super-admin | `/platform` — `User.platformAdmin`, uses unscoped Prisma |
| Patient identity | One `User` + `CustomerProfile` across the network |
| Patient ↔ pharmacy | `customer_pharmacies` + per-pharmacy `loyalty_accounts` |
| Staff access | `pharmacy_memberships` (owner / manager / pharmacist / staff) |
| Secrets | Platform env + per-tenant `pharmacy_integrations` (not extra `.env` files) |

Fail-closed: if no tenant can be resolved, queries use a zero UUID so they
return **empty**, never another pharmacy's rows.

## Onboarding (pharmacy)

1. Owner opens `/for-pharmacies` then `/onboard`.
2. Creates an account (or signs in) and a **draft** pharmacy (`status=draft`).
3. Adds licence, city, phone, hours → **Submit for review**.
4. Super-admin at `/platform/applications` verifies PPB licence:
   - `needs_info` — owner can edit and resubmit
   - `reject` — closed with a reason
   - `approve` — owner completes `/admin/setup` checklist
5. Owner (or super-admin) **lists** the pharmacy. Status becomes `active`,
   `listed=true`, and it appears on the marketplace.

## Super-admin

Route prefix `/platform`. Capabilities:

- Verification queue (draft / submitted / under review / needs info)
- Approve / reject / request info
- List, feature, suspend, restore a tenant
- Impersonate (sets staff cookie, opens `/admin` for that pharmacy)
- Network stats

Demo: `platform@aether.health` / `Password123!`

## Staff CRM (`/admin`)

Unchanged screens, now tenant-scoped by Prisma client extension
(`app/lib/db/prisma.ts` + `TENANT_MODELS`). Staff with several memberships
use `/admin/select` or the sidebar switcher.

## Customer portal

One login. Prescriptions, refills, loyalty, and messages are **per pharmacy**.
`/portal/pharmacies` lets a patient join another storefront and switch the
active pharmacy (cookie `aether_pharmacy`).

Jane's demo account is linked to **Aether** and **Coast Care**.

## Public pages

| Static (platform) | Configurable per pharmacy (admin) |
| --- | --- |
| Marketplace `/`, `/for-pharmacies`, `/onboard` | Storefront home `/p/{slug}` |
| `/privacy`, `/terms`, `/login`, `/register` | Hours, address, phone, about, logo |
| Platform name/tagline (`app/lib/data.ts` `platform`) | Delivery notes/fees, FAQ, team, insurance |
| Network health library (`articles` corpus) | Catalogue, services, vaccines |

Visiting `/p/{slug}` sets a cookie so `/medicines`, `/services`, `/refill`
stay on that pharmacy without duplicating every route.

## Storefront template + overrides (the /p/* content model)

Every `/p/{slug}` room renders from **one shared template** that tenants can
personalise — no more copy typed into pages:

1. `app/lib/storefront-template.ts` — `STOREFRONT_TEMPLATE`, the baseline
   static information available across all `/p/*` pages (hero, quick actions,
   why-choose bullets, values, team, gallery, FAQ, delivery steps, careers,
   health-library labels, CTA banner, socials, insurance/certifications).
2. Tenant identity columns — name, tagline, about, logo/cover, hours,
   delivery fee/radius/notes, careers email (Pharmacy + PharmacySettings).
3. `pharmacy_settings.storefront` JSONB — the Studio override document
   `{ version: 1, … }`. Objects deep-merge; arrays/scalars replace; unknown
   keys ignored; absent keys keep inheriting.
4. Legacy dedicated CMS columns fill any key the doc didn't set.

Resolution lives in `getStorefrontView()`
(`app/lib/services/storefront-content.ts`, request-cached). It returns
`active | unavailable | none`: an explicit but dead `/p/{slug}` shows the
glass "room unavailable" screen instead of the network chooser.

**Customisation UI:** Storefront Studio at `/admin/settings/storefront`
(tabbed editor writing only deltas; blank field = template default;
audit action `storefront_customized`). Tenants accent-brand their room via
hex colours mirrored to `brandPrimary/Accent` and injected as CSS variables
on `<body data-tenant-theme>`.

Copy tokens: `{name}`, `{phone}`, `{city}`, `{description}` interpolate live
tenant facts; a bullet of exactly `__DELIVERY__` renders the real delivery
promise on storefront/about surfaces.

## Env vs database

See `.env.example`. **Platform**: `DATABASE_URL`, `AUTH_SECRET`, Groq, R2,
Resend, Firebase, Google OAuth. **Per pharmacy**: Daraja, Twilio From,
WhatsApp number, POS key, timezone, loyalty multiplier — stored encrypted
on `pharmacy_integrations`.

## Tenant resolution order

1. AsyncLocalStorage (`withPharmacy` / `withPlatformBypass`) — cron, jobs
2. Header `x-platform-bypass` (`/platform`)
3. Header `x-pharmacy-id` (staff cookie, `/admin`)
4. Header `x-pharmacy-slug` (`/p/{slug}` rewrite or public cookie)
5. Cookies `aether_staff_pharmacy` / `aether_pharmacy`
6. Else fail-closed

## Schema notes

- Composite uniques: inventory slug/sku, service slug, coupon code, category
  slug, loyalty `(pharmacyId, customerId)`, referral `(pharmacyId, referralCode)`
- `MedicationMaster` stays global (shared clinical library)
- `PharmacySettings` and `PharmacyImmunizationPolicy` are 1:1 with `Pharmacy`
  (UUID primary keys — not the old singleton `id='default'`)

## Demo tenants (after `npm run db:seed`)

| Slug | Status | Notes |
| --- | --- | --- |
| `aether` | active, featured | Full demo catalogue |
| `coast-care` | active | Second live pharmacy |
| `highlands` | submitted | Sitting in the verification queue |
