# Admin workspace redesign

## Flow priorities

1. Progress open refill requests, answer patient enquiries, and review escalated conversations.
2. Reach frequent tasks directly: new prescription, counter sale, patient lookup, and stock review.
3. Move between related work using workflow navigation, or search all 53 static admin destinations with Control/Command K.
4. Review performance and manage pharmacy settings after daily work. Performance cards remain available in an expandable dashboard section.

## Page coverage

The shared workspace, page descriptions, spacing, typography, theme colors, and responsive records treatment cover the admin route families below. Dynamic patient and prescription details retain their contextual data headings.

| Area | Pages and workflows |
| --- | --- |
| Daily work | Dashboard, prescriptions and details, new prescription, refills, dispensing, sales and orders, inbox |
| Medicines | Catalogue, add, manual entry, library, barcode scanning, CSV and AI-assisted import, incomplete records, categories, metrics, inventory |
| Patients and clinic | Patients and details, services, bookings, screenings, vaccinations, adherence, symptom check-ins |
| Communication | Enquiries, messages, campaigns, reminders, feedback, notifications, templates, segments, loyalty, AI review, knowledge |
| Reporting | Reports hub, overview, revenue, sales, payments, prescriptions, refills, inventory, products, customers, staff, reconciliation |
| Management | Pharmacy selection, location, storefront, integrations, setup |

Shared dialogs use native modality, Escape handling, and explicit trigger-focus restoration. Form improvements associate 102 labels with controls. Common controls have larger touch targets, visible focus treatment, and submission feedback. Tables receive keyboard-accessible scrolling where their content needs additional width.

## Verification

- Static route registry checked against all 53 static admin page routes; nine related-workflow groups checked for unique paths and nested route matching.
- Admin TypeScript/TSX syntax and targeted shared-component ESLint checks passed.
- Full TypeScript check reports the pre-existing readonly `NODE_ENV` assignment at `tests/rls-postgres.test.ts:100`.
- Browser verification used an isolated local fixture importing the actual workspace components and compiled application CSS, with fictional records and stubbed framework actions. Checked desktop and 320px, 390px, and 768px layouts, both themes, mobile drawer, page search autofocus and filtering, Escape handling, and dialog trigger-focus restoration. Checked layouts had no page-level horizontal overflow.
- The local Next development server stalled compiling the proxy, so authenticated database-backed pages and real submissions were not exercised end to end. The fixture does not establish production integration correctness or a complete accessibility conformance audit.

No deployment was performed.
