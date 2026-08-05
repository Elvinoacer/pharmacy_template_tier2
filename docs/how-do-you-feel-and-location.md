# How do you feel? + Admin location — design & implementation

**Status:** Implemented  
**Date:** 2026-08-05

## Overview

Two complementary features:

1. **How do you feel?** — AI-aided mild-symptom triage with structured intake, image uploads, time-based check-ins, escalation to pharmacists (ticket + alerts + AI summary), and dedicated UX for guests, customers, and staff.
2. **Pharmacy location** — Admin configures lat/lng (including “use my current location”), address, and hours; public contact page shows the map and a **Get directions** button from live settings.

## Goals

- Reduce phone load for everyday mild concerns while keeping pharmacists in control of clinical decisions.
- Give staff a rolling AI summary and full transcript (with images) when a case escalates.
- Let guests continue on-device via localStorage keys; logged-in customers keep history in the DB.
- Let any pharmacy admin set their real pin without editing code.

## Non-goals

- Definitive medical diagnosis or prescribing.
- Replacing emergency services.
- Multi-branch inventory of locations (single pharmacy settings row for now).

## UX by audience

### Guest (public `/how-do-you-feel`)

1. Disclaimer (not a diagnosis / emergency guidance).
2. Category chips (headache, stomach, cold/flu, skin, allergy, other).
3. Conversational triage: one question at a time, optional photos.
4. **How do I feel now?** check-ins (better / same / worse).
5. **Talk to a pharmacist** anytime → ticket + staff alert; AI clinical advice pauses.
6. `localStorage`: `aether-feel-guest-key`, recent session ids; server still stores rows keyed by `guestKey`.

### Customer (portal `/portal/feel`)

Same UI; sessions linked to `customerId` / `userId` for cross-device history.

### Admin (`/admin/feel`, `/admin/feel/[id]`)

- Queue prioritising escalated cases.
- AI summary, provisional non-diagnostic label, severity, feeling trend.
- Full transcript + image gallery.
- Staff reply (mirrors into CRM conversation when present).
- Admin notifications + push on escalation / “feeling worse”.

### Location admin (`/admin/settings/location`)

- **Use my current location** (browser geolocation + optional Nominatim reverse geocode).
- Manual lat/lng, address, hours, contact fields.
- Live map preview + test directions link.
- Saves singleton `PharmacySettings` row (`id = default`).

### Public contact (`/contact`)

- Reads `getResolvedPharmacy()` (DB wins over static `app/lib/data.ts`).
- Map embed from lat/lng (or custom embed URL).
- **Get directions** uses coordinates when available.

## Data model

- `PharmacySettings` — singleton config.
- `SymptomSession` / `SymptomMessage` / `SymptomCheckIn` — triage state machine:
  - `active` → `monitoring` → `escalated` | `resolved` | `closed`
- Escalation creates `Conversation` + `Enquiry` tickets and notifies staff.

## APIs

| Route | Purpose |
|-------|---------|
| `GET/POST /api/feel/session` | List/create sessions |
| `POST /api/feel/chat` | User message + images; AI until escalated |
| `POST /api/feel/upload` | Session-scoped image upload (R2) |
| `POST /api/feel/check-in` | better / same / worse |
| `POST /api/feel/escalate` | Explicit pharmacist handoff |
| `POST /api/feel/admin/reply` | Staff reply |

## AI behaviour

- Groq text model for triage; vision model when images present (`GROQ_VISION_MODEL`, fallback text + URL list).
- Red-flag phrase detection forces escalation.
- Rolling JSON summary for staff (`aiSummary`, `provisionalLabel`, `severity`).
- After escalation: no further clinical AI advice — acknowledge only.

## Security & privacy

- Guest access requires matching `guestKey` for the session.
- Uploads rate-limited and bound to an existing session.
- Staff-only admin reply and location settings.
- Clear non-diagnosis / emergency copy in the UI and system prompt.

## Key files

- `app/lib/services/symptom-triage.ts`
- `app/lib/services/pharmacy-settings.ts`
- `app/components/feel/HowDoYouFeelClient.tsx`
- `app/components/admin/LocationSettingsForm.tsx`
- `prisma/migrations/20260805200000_symptom_triage_and_location/`

## Key decisions

1. **Dedicated symptom tables** (not only `AiConversation`) — check-ins, severity, tickets, and image arrays need first-class fields.
2. **AI until ticket** — images and chat stay with AI; staff take over after escalate.
3. **DB + localStorage for guests** — continuity on device and server-side staff visibility.
4. **Singleton PharmacySettings** — simple admin UX for single-tenant pharmacies.
5. **Coordinate-first maps** — embed + directions from lat/lng without requiring a Maps API key for basic display.
