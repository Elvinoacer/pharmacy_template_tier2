# Changes

## Storefront template + multi-tenant /p/* rooms

### Template layer (shared baseline)
- New `app/lib/storefront-template.ts` — a typed `STOREFRONT_TEMPLATE` holding all the polished static copy that previously lived inline in pages or `app/lib/data.ts` (hero, quick-action labels, why-choose bullets, values, team, gallery, FAQ, delivery steps, careers, health-library labels, CTA banner, social links, insurance/certifications). This is what every `/p/{slug}` room inherits on day one.
- New merge engine `app/lib/services/storefront-content.ts` — `getStorefrontView()` resolves each request through layers: template → tenant profile (`Pharmacy` + `PharmacySettings` identity columns) → per-tenant `storefront` JSON override document → legacy dedicated CMS columns (`brandPrimary/Accent`, `social`, `team`, `faq`, `insurance`, `certifications`). Merge semantics: objects deep-merge, arrays/scalars replace, unknown keys ignored.
- `{name}`, `{phone}`, `{city}`, `{description}` tokens interpolate against live tenant facts; the `__DELIVERY__` bullet token renders the pharmacy's real delivery promise.

### Dynamic pages
- `/storefront` (home), `/about`, `/faq`, `/delivery`, `/careers` now render from `getStorefrontView()` instead of hard-coded imports. The `/about` team section no longer gates on `slug === "aether"` — any tenant that customises its roster shows it; otherwise template content shows as designed.
- New "room unavailable" state: an explicit `/p/{slug}` pointing at nothing live now renders a glassmorphic `StorefrontUnavailable` screen with marketplace links, instead of silently swapping to the network chooser. Chooser behaviour stays for generic (non-`/p/`) contexts.
- `FaqAccordion` accepts an `items` prop (default remains the shared corpus), so network surfaces are untouched while storefronts pass tenant FAQs.
- `CtaBanner` gained an `eyebrow` prop wired to template content.

### Glassmorphism uplift
- New light-glass utilities in `globals.css`: `.glass-chip`, `.glass-tile`, `.glass-tile-strong`, `.glass-panel`, `.glass-panel-strong` — matching the landing page's translucency/blur/hairline-border language.
- Tenant accent theming: layout injects `--tenant-brand-primary/--tenant-brand-accent` on `<body data-tenant-theme>` when set; CSS re-tints buttons, gradient text and the trust band via scoped rules with `color-mix()` fallbacks to network teal. Colours are hex-validated before touching CSS variables.

### Storefront Studio (admin)
- `/admin/settings/storefront` — tabbed editor (Basics · Hero · Home sections · Team & photos · FAQ · Careers & delivery · Brand & CTA) writing only personalisation deltas: blank fields keep inheriting the template, per-section "Customise"/"Restore template" toggles, list editors for team/gallery/FAQ/jobs/values/steps/insurance/certifications, colour pickers, social links.
- Server action `saveStorefrontAction` validates the whole document with zod (bounded strings/arrays, http(s)-only URLs, strict root shape), prunes empties, writes the `storefront` JSONB column plus identity columns via `upsertPharmacySettings`, writes an audit log entry and revalidates affected public routes.
- Nav entry added in AdminShell under Intelligence & Settings.

### Data & SEO
- `PharmacySettings.storefront Json @default("{}")` added with migration `20260827090000_storefront_template_overrides`.
- Seed gives Coast Care an override document (coastal hero line, ocean-amber theme, custom bullets/delivery steps) so multi-tenancy is visible out of the box; Aether demonstrates pure-template rendering.
- `sitemap.xml` now emits `/p/{slug}` entries for every active, listed pharmacy.

### Validation
- `tsc --noEmit` clean; production `next build` passes (101 routes); ESLint clean on all touched files. Full-site dynamic rendering preserved; DB-touching paths remain fail-closed/catch-wrapped so builds without a database still succeed.

## Caregiver action flows

### Fixed: caregiver refill request entry point
- `/caregiver/refills/new` no longer redirects back to `/caregiver/refills` merely because no `customerId` query parameter was supplied.
- When the caregiver has exactly one patient with refill permission, the page opens that patient's refill form automatically.
- When the caregiver has multiple eligible patients, the page now presents a patient selector containing only patients for whom refill permission is active.
- When the caregiver has no eligible patients, the existing safe return to `/caregiver/refills` remains in place.

### Fixed: prescription selection from patient context
- Refill links that include `prescriptionId` now preselect that prescription in the refill form instead of silently defaulting to the first prescription.
- Server-side authorization and prescription ownership checks remain enforced; the UI changes do not weaken caregiver permissions.

### Authorization preserved
- Caregiver refill submission still requires an active caregiver relationship and `canRequestRefills` permission.
- The API still verifies that the selected prescription belongs to the selected patient and is active, and that refills remain available.
- Caregivers still cannot approve or prepare refills themselves.

## Validation
- Reviewed caregiver refill, adherence, patient-detail, notification, and caregiver API flows for the same authorization/entry-point pattern.
- The caregiver adherence API already enforces `canLogAdherence` and prescription ownership.
- Pickup notifications are correctly restricted to linked patients with `canReceivePickupNotifications`.
- Full lint/build could not be executed in the supplied archive because `node_modules` is not present in the project and package installation was not performed.
