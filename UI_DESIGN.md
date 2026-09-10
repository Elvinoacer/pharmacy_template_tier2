# Care-first interface

The shared design uses translucent surfaces over an ambient canvas, solid form fields,
and a single light/dark/system preference across public, patient, caregiver, and staff
screens. Cinematic images and inset promotional panels retain their dark contrast.

## Action priority

| Priority | Intent | Presentation |
| --- | --- | --- |
| P0 | Browse medicines, services, or pharmacies | Dedicated network catalogues; no pharmacy gate before discovery |
| P0 | Complete the current refill, order, or booking | Tenant-scoped forms begin only after a pharmacy/listing has been chosen |
| P1 | Compare providers | Every network medicine/service listing identifies its source pharmacy and location |
| P1 | Track existing care | My care shortcut into the authenticated portal |
| P1 | Search and narrow results | Network catalogue search, pharmacy directory filters, readable result cards |
| P2 | Learn and prepare questions | Health guides remain a dedicated discovery pathway |
| P2 | Appearance preferences | Accessible theme controls in shared navigation |
| P3 | Pharmacy acquisition | Desktop/mobile menu only; does not compete with patient discovery actions |

## Shared behavior

- Theme choice persists, follows the device in system mode, and initializes before paint.
- Existing admin preference is used when no global preference has been saved.
- Device changes and cross-tab preference changes update the interface.
- Glass panels have a solid fallback; reduced-motion preferences suppress movement.
- Small-screen form fields use at least 16px text to prevent mobile input zoom.
- The landing page remains impression/brand space; persistent discovery navigation starts on dedicated care pages, not on `/`.
- Mobile care navigation reserves bottom safe-area space, stays hidden near the top and footer, hides while scrolling down or typing, and returns on upward scroll or after scrolling settles.
- The shared mobile dock exposes Pharmacies, Medicines, Services, Health, and My care. Transactional actions such as refill/order stay contextual instead of consuming a permanent tab.
- `/medicines` and `/services` are network-first marketplaces. A remembered pharmacy never silently narrows those roots.
- A pharmacy can still be intentionally selected with the catalogue `pharmacy` filter or from `/pharmacies`.
- Medicine/service cards link to an explicit `/p/{slug}/...` destination so the chosen item establishes the pharmacy context before a pharmacy-owned detail or transaction runs.
- Tenant selection is required at the action boundary, not at the discovery boundary.
- Legacy palette utilities map to semantic dark colors while components migrate to tokens.

## Verification scope

Theme initialization was checked for explicit light/dark, device preference, invalid
storage values, and unavailable storage. Browser inspection must still verify the
full route matrix, including authenticated clinical forms, narrow tables, and dialogs.
The local preview encountered browser timeouts and Next.js reported a slow filesystem.

Targeted lint for the new theme and pathway components passed. Full TypeScript
checking reported the existing read-only NODE_ENV assignment in
`tests/rls-postgres.test.ts:100`. AdminShell has pre-existing explicit-any lint errors.
