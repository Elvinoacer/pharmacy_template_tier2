# Customer care discovery

Customers can start at `/` without selecting a pharmacy or creating an account.

- `/medicines` searches public medicine listings across the network.
- `/prescription` reads prescription photos or accepts up to 12 medicine names. Customers review extracted names and strengths before checking availability.
- `/refill` starts from medicine availability or a public inventory listing; it never asks customers to choose a pharmacy.
- `/pharmacies/[slug]` provides pharmacy contact details, opening hours, directions, maps, published gallery photos, and scoped enquiries without changing the customer’s pharmacy context.
- `/services` lists pharmacy services and carries the selected provider into the existing service and booking flow.

## Prescription-to-request flow

1. A JPEG, PNG or WebP photo (up to 5 MB) is sent to the configured Groq vision model to extract medicine names and strengths. The interface explains this before upload. Manual entry remains available.
2. The customer reviews the extracted text and optionally specifies a town or county.
3. The availability endpoint searches active, public inventory with positive stock at active, listed pharmacies. Matching requires the supplied name and strength tokens; results are not approved substitutions.
4. Availability produces one pharmacy offer, prioritising medicine coverage, then total listed price. Partial matches explicitly identify missing medicines. Prices, product links, and the supplying pharmacy’s about page remain visible. A search capped at 200 candidates per medicine prompts the customer to narrow the query.
5. Continuing with available medicines carries their inventory IDs into the request form. The customer supplies contact and pickup details; there is no pharmacy chooser.
6. The request endpoint rechecks that every inventory ID is public, active, in stock, and belongs to the same active listed pharmacy. It derives the supplier and canonical medicine names/strengths from those listings, scopes the request to it, and uses the existing staff queue and notification flow. Duplicate requests return the existing reference. Guest tracking links are returned when the application's tracking secret is configured.

The search photo is not attached to the pharmacy request or saved by this flow. The selected pharmacy must obtain and review the original prescription before dispensing. This implementation supports image uploads, not PDF extraction.

## Admin requirements

The dashboard links to medicine management, incoming medicine requests, and services. It also reports how many medicines and services are publicly discoverable.

To appear in prescription results, a pharmacy must be active and listed, and its inventory must be active, publicly listed, and in stock. Staff maintain the price and stock in the existing inventory tools. Active services at an active, listed pharmacy appear in service discovery. Bookability is managed in the existing service editor.

Search results do not reserve inventory. Staff confirm stock, review the request, and update its status through the existing refill workflow.

## Verification

- `npm run typecheck`
- ESLint on changed TypeScript and TSX files.
- `npm test` includes prescription matching and isolated request-handoff tests.
- Browser checks cover desktop/mobile rendering, photo extraction using a synthetic prescription, live catalogue empty states, and comparison/request UI using controlled fixtures.

The request-handoff tests use an isolated store and do not send notifications to real pharmacy staff. A real fulfilment walkthrough requires published inventory and an authorised pharmacy operator; the connected catalogue contained no public medicine listings during implementation verification.

## Visual system

Priority pages share an ivory/forest glass surface system, editorial illustrative imagery, responsive care navigation, button feedback, and page-entry animation with reduced-motion support. Bundled imagery is illustrative; pharmacy galleries show only published pharmacy photos.

The liquid-glass refinement shares translucent layers, refractive edge highlights, and contrast tokens across both themes. Pointer-following highlights and spring press feedback are progressively enhanced; below-fold sections reveal once on arrival. Reduced-motion preferences remove entrance, floating, press, and image motion. Reduced-transparency preferences and missing backdrop-filter support use solid readable surfaces. The preview permits the loopback development origin `127.0.0.1`.
