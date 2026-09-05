# Care-first interface

The shared design uses translucent surfaces over an ambient canvas, solid form fields,
and a single light/dark/system preference across public, patient, caregiver, and staff
screens. Cinematic images and inset promotional panels retain their dark contrast.

## Action priority

| Priority | Intent | Presentation |
| --- | --- | --- |
| P0 | Find a pharmacy and start care | First landing pathway and emphasized mobile dock action |
| P0 | Complete the current refill, order, or booking | Preserve existing tenant-scoped forms and primary submit actions |
| P1 | Track existing care | My care shortcut into the authenticated portal |
| P1 | Search and narrow results | Glass directory search panel, mobile filters, readable result cards |
| P2 | Learn and prepare questions | Health guides pathway and secondary dock action |
| P2 | Appearance preferences | Accessible theme controls in shared navigation |
| P3 | Pharmacy acquisition | Desktop navigation and existing mobile menu; avoids crowding mobile care actions |

## Shared behavior

- Theme choice persists, follows the device in system mode, and initializes before paint.
- Existing admin preference is used when no global preference has been saved.
- Device changes and cross-tab preference changes update the interface.
- Glass panels have a solid fallback; reduced-motion preferences suppress movement.
- Small-screen form fields use at least 16px text to prevent mobile input zoom.
- Mobile care navigation reserves bottom safe-area space and remains visible.
- Pharmacy selection precedes network-level clinical requests.
- Legacy palette utilities map to semantic dark colors while components migrate to tokens.

## Verification scope

Theme initialization was checked for explicit light/dark, device preference, invalid
storage values, and unavailable storage. Browser inspection must still verify the
full route matrix, including authenticated clinical forms, narrow tables, and dialogs.
The local preview encountered browser timeouts and Next.js reported a slow filesystem.

Targeted lint for the new theme and pathway components passed. Full TypeScript
checking reported the existing read-only NODE_ENV assignment in
`tests/rls-postgres.test.ts:100`. AdminShell has pre-existing explicit-any lint errors.
