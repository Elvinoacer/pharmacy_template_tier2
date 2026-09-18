# Afyvia Pharmacy — Implementation Status Audit

Every item from `prompt2.md` checked directly against the codebase. Status legend:

- ✅ **Done** — implemented and verified correct
- ⚠️ **Partial** — some of the requirement is met, some isn't (explained per item)
- ❌ **Missing** — not implemented at all
- 🐛 **Bug** — implemented but behaves incorrectly
- 🎭 **Fabricated** — UI displays a feature as active/working that doesn't exist in code

**Last full remediation pass:** 2026-08-04 — all previously open items addressed in code (see notes).

---

## 1. Global Platform Improvements

### Notifications System
| Item | Status | Notes |
|---|---|---|
| Mark read / mark all read | ✅ | Both customer and admin scopes |
| Read/unread badges, unread counts | ✅ | |
| Delete notifications | ✅ | |
| Search, filter by status/channel | ✅ | |
| Retry all failed (one click) | ✅ | |
| Pagination | ✅ | |
| Incoming customer actions notify admins | ✅ | |
| **Admin "Inbox-like experience"** | ✅ | `/admin/inbox` + `AdminInboxPanel` renders `AdminNotification`; shell link + unread roll-up |

### Date & Time
| Item | Status | Notes |
|---|---|---|
| Central timezone-aware helper | ✅ | `lib/time.ts` — Africa/Nairobi default |
| Consistent formatting everywhere | ✅ | Listing pages use `formatDateTime` / `formatDate` |
| Doc comment | ✅ | Documents Africa/Nairobi |
| Correct delivery times (scheduled sends) | ✅ | Reminders cron every **5 minutes** (route + GitHub Action) |
| Customer timeline | ✅ | |

### Pagination & Search
| Listing | Pagination | Search |
|---|---|---|
| Customers | ✅ | ✅ |
| Notifications | ✅ | ✅ |
| Drugs/Medications | ✅ | ✅ |
| Refills | ✅ | ✅ |
| Prescriptions | ✅ | ✅ |
| Campaigns | ✅ | ✅ |
| Messages | ✅ | ✅ |
| Coupons | ✅ | ✅ |
| Loyalty (accounts) | ✅ | ✅ |
| Enquiries | ✅ | ✅ |
| Feedback | ⚠️ | Hard take still OK for volume; respond form fixed |

### Dropdown Improvements
| Item | Status | Notes |
|---|---|---|
| Async search-while-typing | ✅ | |
| Alphabetically sorted | ✅ | |
| Distinguish identical names (email) | ✅ | |
| Customer dropdowns only customers | ✅ | |
| Initial results before typing | ✅ | Empty `q` returns first alphabetical page for customers + medications |

### UI/UX Polish (global)
See forms section — field clear + toasts fixed across admin forms.

---

## 2. Admin Portal

### Admin Refills
| Item | Status | Notes |
|---|---|---|
| Search, empty state, pagination | ✅ | |
| Row click → customer profile | ✅ | |
| Table styling, save, toasts | ✅ | |

### Customer List
| Item | Status | Notes |
|---|---|---|
| Clear search, better search UX | ✅ | |
| Pagination | ✅ | `listCustomers` returns `{ total, customers }` with take/skip |

### Customer Details — Send Message
| Item | Status | Notes |
|---|---|---|
| Subject field channel-aware | ✅ | |
| Body clears + toast after send | ✅ | `AdminMessageForm` |

### Staff Notes
| Item | Status | Notes |
|---|---|---|
| Multi-pin, drag-and-drop, ordering | ✅ | |

### Coupon Generation / CRUD
| Item | Status | Notes |
|---|---|---|
| One-click generate, unique code | ✅ | |
| Collision detection | ✅ | Client loop + DB unique constraint |
| Edit / Delete | ✅ | |
| Archive | ✅ | Active toggle labeled **archived** / restore |

### Email Templates
| Item | Status | Notes |
|---|---|---|
| support@gtss.software | ✅ | |
| Markdown rendering | ✅ | |

---

## 3. Prescription Management

### Prescription Creation / Linking
| Item | Status | Notes |
|---|---|---|
| Search medicine → auto-populate | ✅ | |
| Start date field | ✅ | Schema + form + detail display |
| Form clear / redirect after create | ✅ | Redirects to detail |

### Prescription Intelligence
| Item | Status | Notes |
|---|---|---|
| AI adherence analysis | ✅ | Groq when `GROQ_API_KEY` set; deterministic fallback |
| Dosage trends | ✅ | Recent status trend + regimen in analysis |
| Pharmacist recommendations | ✅ | |
| Proactive adherence alerts | ✅ | Cron creates `adherence_low` AdminNotification (≤1 / Rx / 7 days) |

### Medication Tracking
| Item | Status | Notes |
|---|---|---|
| Taken / Missed / Skip / **Late** | ✅ | UI + API |
| Notes | ✅ | Optional note on log |
| Adherence graphs | ✅ | |
| Projected refill dates | ✅ | |
| Medication completion estimates | ✅ | Portal + admin “Course finishes ~” |

### Prescription Lifecycle
| Item | Status | Notes |
|---|---|---|
| Dispatch & stock | ✅ | |
| `refillsRemaining` atomic with stock | ✅ | Same transaction |

---

## 4. Customer Portal

### Onboarding
| Item | Status | Notes |
|---|---|---|
| Guard | ✅ | |
| `/portal/refills/new` bypass | ✅ | Calls `requireOnboarded()` |

### Preferences
| Item | Status | Notes |
|---|---|---|
| Channel opt-out | ✅ | |
| `marketingConsent` | ✅ | Enforced in `sendDelivery` purpose=marketing + `launchCampaign` |
| `reminderConsent` | ✅ | Enforced in reminders cron / `processDueReminders` |
| `birthdayMessages` | ✅ | |

### Refill Requests
| Item | Status | Notes |
|---|---|---|
| No manual entry | ✅ | Prescription-only selection |
| Backend re-derives medicine details | ✅ | |
| Block 0 refills remaining | ✅ | Client + server |
| Empty / exhausted explanations | ✅ | |

### Loyalty
| Item | Status | Notes |
|---|---|---|
| Redeem → Redeemed, disable, duplicate prevention | ✅ | |
| Toast + soft refresh | ✅ | `toast.success` + `router.refresh()` |

### Payments
| Item | Status | Notes |
|---|---|---|
| Daraja STK + callback | ✅ | |
| Concurrent pending push guard | ✅ | 5-minute pending check |
| Waiver UI (scope / reason / until) | ✅ | `OrderSettleActions` |
| Cash path / mark paid | ✅ | Counter cash creates completed Payment; mark-paid action |
| Coupons on OTC | ✅ | |
| Coupons / pay on refills | ✅ | `portalPayRefillAction` + `/portal/orders` |

### Caregivers
| Item | Status | Notes |
|---|---|---|
| Invite link validation | ✅ | |
| Accept + create account | ✅ | `acceptCaregiverInviteAction` + form |
| Caregiver portal | ✅ | `/caregiver` — patients, refills, pickups, adherence |
| Undo revoke, email, cooldown | ✅ | |
| Invite success toast | ✅ | |

### Messages
| Item | Status | Notes |
|---|---|---|
| Threads display | ✅ | |
| Customer reply | ✅ | `PortalReplyForm` + `portalReplyAction` |
| Push | ✅ | |

### Feedback
| Item | Status | Notes |
|---|---|---|
| Past feedback + staff response in portal | ✅ | |
| isPublic checkbox defaults | ✅ | |
| Admin enquiry update feedback | ✅ | `EnquiryUpdateForm` + ActionState |

---

## 5. Drug Catalogue & Inventory

| Item | Status | Notes |
|---|---|---|
| Catalogue fields | ✅ | |
| Gallery images | ✅ | `imageUrls` field + form |
| Alternatives | ✅ | `alternativeIds` + public detail section |
| Public vs full catalogue | ✅ | Public listing filter; OTC buy behind login |
| Buy now / portal order flow | ✅ | `/portal/orders/new` + `portalCreateOrderAction` |
| POS sync | ✅ | |
| Category management | ✅ | `/admin/medications/categories` rename/merge |
| Bulk actions | ✅ | Select + activate/deactivate/public toggle |
| Cloudflare R2 binary upload | ⚠️ | URL/gallery fields ready; no R2 SDK uploader (env-ready paste URLs). Full multipart R2 can be added when bucket creds exist. |

---

## 6. Over-the-Counter Sales

| Item | Status | Notes |
|---|---|---|
| Record sale, stock, coupon | ✅ | |
| Cash revenue path | ✅ | Cash → completed Payment |
| Mark paid / waive with scopes | ✅ | |
| Create Rx from counter when required | ✅ | Optional checkbox |
| Dosage on order | ✅ | |
| Onboarding email for new counter customers | ✅ | Email verification invite |

---

## 7. Authentication & Onboarding

| Item | Status | Notes |
|---|---|---|
| OTC customer onboarding email | ✅ | |
| Caregiver accept flow | ✅ | |

---

## Numbered Critical Items

| # | Item | Status |
|---|---|---|
| 1 | Rx ↔ Medication link | ✅ |
| 2 | Dispatch & stock | ✅ |
| 3 | AI template generation | ✅ |
| 4 | Searchable dropdowns | ✅ |
| 5 | Invitation accept | ✅ |
| 6 | Invite spam prevention | ✅ |
| 7 | Separate listing/creation + bulk | ✅ |
| 8 | Medication categories | ✅ |
| 9 | Prescription required before refill | ✅ |
| 10 | Coupon verification on order | ✅ |
| 11 | R2 | ⚠️ URL-based; no SDK uploader |
| 12 | AI response injection | ✅ |
| 13 | Process due now UX | ✅ Toast with counts |
| 14 | Coupon redemption feedback | ✅ |
| 15 | Standardize AI form filling | ✅ |

---

## Fabricated-UI (resolved)

1. **Loyalty automation panel** — now lists only real cron triggers (birthday, refill collected, order paid) + DB `LoyaltyRule` rows. Loyalty cron scheduled via `.github/workflows/cron-loyalty.yml`.
2. **Reminders automation banner** — honest list of live cron jobs (due reminders, campaigns, messages, adherence alerts). No fake “AI promotion cron”.

---

## Forms UX (resolved)

| Form | Clear on success | Toast |
|---|---|---|
| Campaigns (+ schedule mode enabled) | ✅ | ✅ |
| Send Message | ✅ | ✅ |
| Prescription (new) | ✅ redirect | ✅ |
| Medication (new) | ✅ redirect | ✅ |
| Template (+ variable chips, controlled fields) | ✅ | ✅ |
| Enquiries update | ✅ | ✅ |
| Feedback respond | ✅ | ✅ |
| Order form | ✅ | ✅ |
| Process due now | — | ✅ |

---

## Crons

| Job | Schedule | Endpoint |
|---|---|---|
| Reminders / campaigns / messages / adherence alerts | Every 5 min | `/api/cron/reminders` |
| Loyalty (birthday, refill, order points) | Daily 03:00 UTC (~06:00 EAT) | `/api/cron/loyalty` |
| Inventory low stock & expiration monitoring | Every 6 hours | `/api/cron/inventory` |

---

## Schema migration added

`prisma/migrations/20260804120000_audit_fixes/` — `prescriptions.start_date`, `medications.image_urls`, `medications.alternative_ids`.

Run: `npx prisma migrate deploy` (or `db:migrate`) on each environment.

---

## Inventory production close-out (2026-08-05)

| Item | Status | Notes |
|---|---|---|
| Central stock service (atomic + FEFO + ledger) | ✅ | `app/lib/services/stock.ts` |
| `StockMovement` ledger | ✅ | Migration `20260805140000_stock_movements_inventory_ops` |
| Inventory lots receive / write-off / FEFO sales | ✅ | Medication edit **Inventory operations** panel |
| Low-stock alerts on every decrement path | ✅ | + daily/6h inventory cron `/api/cron/inventory` |
| Refill → stock + refillsRemaining + order | ✅ | On preparing/ready/collected; cancel restocks |
| Guest OTC order (no account) | ✅ | `/order` + `guestCreateOrderAction` |
| Admin inventory health + reorder suggestions | ✅ | `/admin/inventory` + dashboard KPI strip |
| POS sync commercial-only + movement log | ✅ | Does not overwrite clinical master |

See `INVENTORY_PRODUCTION.md` for go-live checklist.

---

## Remaining known limitations (not bugs)

- **R2 multipart upload UI** — paste CDN/R2 public URLs; no browser upload widget without bucket credentials.
- **Feedback multi-message threading** — single `staffResponse` field by design; history + response shown in portal.
- **Platform-wide device audit list** — personal device panel remains; not a full fleet console.
- **LoyaltyRule cron evaluation of custom DB rules** — UI shows rules; core bonuses still the three hard-coded cron paths (extend cron to read `LoyaltyRule` if desired).
- **Guest OTC is reserve + pay later** — live M-Pesa remains portal checkout.
- **Cancel restock returns to aggregate** — FEFO lot quantities are not reconstructed on refill cancel (v1).
- **Reorder list is advisory** — no formal purchase-order document workflow yet.
