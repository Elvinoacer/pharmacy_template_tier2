# Pharmacy Template --- Full Repository Feature Documentation

> **Document type:** Static source-code feature inventory and system
> documentation\
> **Repository analyzed:** `pharmacy_template_tier2-main`\
> **Analysis basis:** Complete uploaded repository contents, including
> application code, Prisma schema, migrations, API routes, server
> actions, services, components, documentation, configuration, and
> public assets.\
> **Verification level:** Source-code/static analysis. The application
> was not deployed or exercised end-to-end during this analysis, so this
> document distinguishes code that is present from behavior that would
> require runtime/integration verification.

------------------------------------------------------------------------

## 1. Executive Summary

This repository is a **full-stack pharmacy platform** built around a
Next.js application. It is significantly more than a public pharmacy
website: it contains a public customer experience, authenticated
customer portal, caregiver portal, staff/admin operations console,
pharmacy inventory and medication catalogue, prescription/refill
workflows, adherence tracking, ordering and payments, loyalty,
CRM/communications, AI assistance, symptom triage, pharmacy services,
notifications, delivery integrations, and operational background jobs.

The system is organized around these major user surfaces:

1.  **Public website**
    -   Pharmacy information
    -   Medicine catalogue
    -   Medicine detail pages
    -   Health library
    -   Services
    -   Delivery information
    -   FAQ/contact/careers
    -   Guest refill/order flows
    -   AI pharmacy assistant
    -   Guided "How do you feel?" symptom experience
    -   Image-based medicine search
2.  **Customer portal**
    -   Profile and onboarding
    -   Prescriptions
    -   Refills
    -   Orders
    -   M-Pesa payments
    -   Medication adherence
    -   Dose reminders
    -   Caregiver management
    -   Loyalty/coupons
    -   Messages
    -   Notifications
    -   Preferences
    -   Feedback
    -   Symptom sessions
3.  **Caregiver portal**
    -   Linked patients
    -   Medication visibility
    -   Today's dose checklist
    -   Dose confirmation
    -   Adherence summaries
    -   Refill requests
    -   Pickup alerts
    -   Reminders
    -   Patient-specific views
    -   Permission-controlled patient assistance
4.  **Admin/staff portal**
    -   Dashboard
    -   Customer CRM
    -   Medication catalogue
    -   Shared medication library
    -   Barcode acquisition
    -   AI-assisted medication import
    -   CSV/Excel import
    -   Manual medication entry
    -   Medication validation/enrichment
    -   Inventory and stock lots
    -   Prescriptions
    -   Refills
    -   Orders and fulfilment
    -   Payments
    -   Notifications
    -   Reminders
    -   Campaigns
    -   Segmentation
    -   Messaging/inbox
    -   Templates
    -   Loyalty/coupons
    -   Feedback/enquiries
    -   AI knowledge base
    -   Symptom triage escalation
    -   Pharmacy services and bookings
    -   Pharmacy location/settings
5.  **Integration/backend layer**
    -   Prisma/PostgreSQL
    -   Google OAuth
    -   Firebase Cloud Messaging
    -   Groq AI
    -   M-Pesa Daraja
    -   S3/R2-compatible uploads
    -   Delivery/webhook endpoints
    -   POS integration endpoint
    -   Cron endpoints for inventory, loyalty and reminders

### Repository scale

The uploaded repository contains approximately:

-   **400 source/config/document files**
-   **188 TSX files**
-   **124 TypeScript files**
-   **57 Prisma data models**
-   **34 Prisma enums**
-   **14 database migrations**
-   **40 public image assets/files**
-   **308 files under `app/`**

The database schema is particularly mature for a pharmacy template: it
covers customers, caregivers, prescriptions, adherence, inventory, stock
movements, orders, payments, CRM, communications, loyalty, services,
symptom triage, AI conversations and operational notifications.

------------------------------------------------------------------------

# 2. Technology and Architecture

## 2.1 Main stack

The repository uses:

-   **Next.js 16.2.12**
-   **React 19.2.4**
-   **TypeScript**
-   **Prisma 7.9.1**
-   **PostgreSQL**
-   `@prisma/adapter-pg`
-   Neon/serverless PostgreSQL support
-   **Groq SDK**
-   **Firebase + Firebase Admin**
-   **Google Auth Library**
-   **JOSE** for JWT/session claims
-   **bcryptjs** for password hashing
-   **Zod** for validation
-   **AWS S3 SDK** for object storage/R2-compatible storage
-   **Tailwind CSS 4**
-   **Lucide React**
-   `pg`
-   `uuid`

The application uses server components/server actions extensively, with
API routes where browser integrations, webhooks, uploads, payment
callbacks or other HTTP interfaces are appropriate.

------------------------------------------------------------------------

## 2.2 High-level architecture

``` text
Browser
  |
  +-- Public Website
  |
  +-- Customer Portal
  |
  +-- Caregiver Portal
  |
  +-- Admin / Staff Portal
  |
  v
Next.js App
  |
  +-- Server Components
  +-- Server Actions
  +-- API Routes
  +-- Auth/session layer
  +-- Domain services
  |
  v
Prisma
  |
  v
PostgreSQL
  |
  +-- Customer / CRM data
  +-- Medication master data
  +-- Pharmacy inventory
  +-- Lots / stock movements
  +-- Prescriptions / adherence
  +-- Orders / payments
  +-- Services / bookings
  +-- AI / symptom sessions
  +-- Communications
  |
  +------------------+
  |                  |
  v                  v
External Services   Background jobs
  |                  |
  +-- Groq           +-- Inventory scan
  +-- Firebase       +-- Loyalty processing
  +-- Google OAuth   +-- Reminder processing
  +-- M-Pesa/Daraja
  +-- S3/R2
  +-- Delivery webhooks
```

------------------------------------------------------------------------

# 3. Authentication, Identity and Access Control

## 3.1 Supported roles

The Prisma schema defines:

-   `customer`
-   `caregiver`
-   `pharmacist`
-   `staff`
-   `manager`

Staff access is determined through the shared `isStaff()` logic.

## 3.2 Authentication features

Implemented authentication actions include:

-   Registration
-   Login
-   Logout
-   Forgot password
-   Password reset
-   Email verification
-   Google OAuth
-   Session creation
-   Session expiration
-   Session invalidation
-   Password hashing
-   Session claim cookie
-   Role-aware redirects

Relevant server actions:

-   `registerAction`
-   `loginAction`
-   `logoutAction`
-   `forgotPasswordAction`
-   `resetPasswordAction`

## 3.3 Session model

The database contains:

-   `User`
-   `Session`
-   `PasswordReset`
-   `EmailVerification`
-   `PushDevice`

Sessions store hashed tokens rather than plain session secrets.

The application also uses an `aether_session_claim` JWT-style cookie for
a fast authorization check in `proxy.ts`.

## 3.4 Route protection

Protected surfaces:

-   `/portal/*`
-   `/admin/*`
-   `/caregiver/*`

The proxy performs a fast DB-free claim check and the layouts perform
the authoritative DB-backed session check.

### Role routing behavior

-   Non-authenticated users → `/login`
-   Non-staff attempting `/admin` → `/portal` or `/caregiver`
-   Caregivers attempting general `/portal` routes → `/caregiver`
-   Staff without customer profiles → `/admin`
-   Caregiver invitation acceptance remains publicly accessible
-   Customer onboarding is guarded through the portal flow

------------------------------------------------------------------------

# 4. Public Website Features

## 4.1 Home page

Route:

`/`

The homepage includes:

-   Pharmacy positioning/branding
-   Hero content
-   Service highlights
-   Community/pharmacy story
-   Opening hours
-   Contact information
-   Health article previews
-   Navigation into:
    -   Refills
    -   Services
    -   About
    -   Health library
    -   Contact

------------------------------------------------------------------------

## 4.2 About

Route:

`/about`

Features:

-   Pharmacy story
-   Values
-   Team
-   Certifications/standards
-   Community involvement
-   Physical space/gallery content
-   Contact CTA

------------------------------------------------------------------------

## 4.3 Medicine catalogue

Routes:

-   `/medicines`
-   `/medicines/[slug]`

The public medicine catalogue is backed by pharmacy inventory rather
than merely static marketing content.

Features include:

-   Publicly listed medicines
-   Availability status
-   Pricing
-   Medicine categories
-   Category browsing
-   Search/filtering
-   Medicine detail pages
-   Brand information
-   Generic name
-   Strength
-   Dosage form
-   Description
-   Indications
-   Dosage information
-   Side effects
-   Contraindications
-   Storage
-   Clinical notes
-   Images
-   Related/equivalent medicines
-   Featured brands
-   Pharmacist tips
-   Links into refill/contact/order flows

The public AI assistant is explicitly instructed to never expose exact
stock counts or internal inventory fields.

------------------------------------------------------------------------

## 4.4 Medicine image search

Endpoint:

`POST /api/medicines/image-search`

The repository implements an image-based medicine discovery feature.

Flow:

1.  User uploads a medicine image.
2.  File is validated.
3.  Rate limiting is applied.
4.  AI vision identifies text/details from the pack.
5.  Identified information is matched against the public pharmacy
    catalogue.
6.  Results are returned using the public medicine catalogue card shape.

Supported upload formats documented in code:

-   JPEG
-   PNG
-   WebP

Maximum upload size:

-   5 MB

The endpoint is rate limited to protect the AI/image-search service.

------------------------------------------------------------------------

## 4.5 Health library

Routes:

-   `/health`
-   `/health/[slug]`

Features:

-   Health article listing
-   Individual article pages
-   Article navigation
-   Related reading
-   Markdown-rendered content

The AI assistant can retrieve relevant approved knowledge articles from
the database.

------------------------------------------------------------------------

## 4.6 Pharmacy services

Routes:

-   `/services`
-   `/services/[slug]`

Features:

-   Service catalogue
-   Service descriptions
-   Benefits
-   Eligibility
-   Duration
-   Images/icons
-   Pricing
-   Bookability
-   Related services
-   Online booking

Services are backed by the `PharmacyService` model.

------------------------------------------------------------------------

## 4.7 Delivery

Route:

`/delivery`

Features:

-   Delivery explanation
-   Delivery enquiry form
-   Delivery information
-   Backend delivery endpoint
-   Delivery webhook integration

The system contains a dedicated delivery service layer with
email/SMS/WhatsApp support.

------------------------------------------------------------------------

## 4.8 FAQ

Route:

`/faq`

Features:

-   FAQ browsing
-   Contact escalation

FAQ information is also incorporated into AI pharmacy context.

------------------------------------------------------------------------

## 4.9 Contact

Route:

`/contact`

Features:

-   Pharmacy contact details
-   Opening hours
-   Address
-   Contact form
-   Enquiry creation
-   Symptom-experience CTA

Backend endpoint:

`POST /api/contact`

------------------------------------------------------------------------

## 4.10 Careers

Route:

`/careers`

Features:

-   Job listing
-   Job requirements
-   Application form

Backend endpoint:

`POST /api/careers`

------------------------------------------------------------------------

## 4.11 Legal pages

Implemented:

-   `/privacy`
-   `/terms`

The privacy page covers:

-   Information collection
-   Health information
-   Sharing
-   Retention/security
-   User rights
-   Cookies/analytics

The terms page covers:

-   Acceptance
-   Informational purpose
-   Form submissions
-   Intellectual property
-   Disclaimers
-   Liability
-   Changes

**Important:** the terms page contains language describing the site as
not having a conventional online pharmacy checkout, while the current
codebase actually contains online order/payment functionality. This
should be reconciled before production deployment.

------------------------------------------------------------------------

# 5. Guest Customer Flows

## 5.1 Guest refill

Route:

`/refill`

Features:

-   Guest refill request
-   Login/register promotion
-   Phone/contact fallback

Backend:

`POST /api/refill`

Refill requests can contain:

-   Medicine
-   Prescription reference
-   Customer details
-   Pickup/delivery preference
-   Preferred date/time
-   Notes
-   Source

------------------------------------------------------------------------

## 5.2 Guest ordering

Route:

`/order`

Features:

-   Guest order creation
-   Guest contact information
-   Medicine selection
-   Fulfilment choice
-   Order reason/notes
-   Portal promotion

Backend action:

`guestCreateOrderAction`

------------------------------------------------------------------------

# 6. Customer Portal

The customer portal is the authenticated self-service layer.

## 6.1 Portal dashboard

Route:

`/portal`

The dashboard provides shortcuts/visibility for:

-   Refills
-   Prescriptions
-   Messages
-   Orders
-   Caregivers
-   Loyalty
-   Notifications
-   Medication adherence/reminders

------------------------------------------------------------------------

## 6.2 Customer onboarding

Route:

`/portal/onboarding`

The portal supports onboarding completion before access to normal
customer functionality.

The customer profile supports:

-   Full name
-   Phone
-   Date of birth
-   Gender
-   Address
-   City/state/ZIP
-   Preferred communication channel
-   Emergency contact
-   Preferred branch
-   Notes
-   Tags
-   Age segment

------------------------------------------------------------------------

## 6.3 Customer profile

Route:

`/portal/profile`

Features:

-   View profile
-   Edit profile
-   Persist customer information

Server action:

`updateProfileAction`

------------------------------------------------------------------------

## 6.4 Customer preferences

Route:

`/portal/preferences`

Supported preferences:

-   Email notifications
-   SMS
-   WhatsApp
-   Marketing consent
-   Reminder consent
-   Birthday messages

Server action:

`updatePreferencesAction`

------------------------------------------------------------------------

## 6.5 Customer prescriptions

Route:

`/portal/prescriptions`

Customers can view prescriptions including:

-   Medicine
-   Prescription reference
-   Dosage
-   Schedule
-   Quantity
-   Days of supply
-   Refills remaining
-   Last fill
-   Next refill due
-   Start/end dates
-   Prescriber
-   Status
-   Price
-   Notes
-   Linked catalogue medication

Prescription statuses:

-   Active
-   On hold
-   Expired
-   Discontinued

------------------------------------------------------------------------

# 7. Refill Management

## 7.1 Customer refill flow

Routes:

-   `/portal/refills`
-   `/portal/refills/new`

Features:

-   View refill requests
-   Create refill requests
-   Link refill to prescriptions
-   Request pickup or delivery
-   Preferred date/time
-   Notes
-   Cancel refill
-   Payment flow for priced refills

Server actions:

-   `portalRefillAction`
-   `cancelRefillAction`
-   `portalPayRefillAction`

------------------------------------------------------------------------

## 7.2 Refill lifecycle

Statuses:

1.  `submitted`
2.  `under_review`
3.  `approved`
4.  `preparing`
5.  `ready_for_pickup`
6.  `collected`
7.  `cancelled`

Refills can originate from:

-   Website
-   Portal
-   AI
-   Phone
-   WhatsApp
-   Staff

------------------------------------------------------------------------

## 7.3 Stock/refill relationship

The repository contains explicit service logic connecting:

-   Prescription
-   Refill request
-   Order
-   Inventory
-   Stock movements
-   Fulfilment

Inventory is not supposed to be reduced merely because a
prescription/refill exists. Dispatch/fulfilment operations are
responsible for the physical stock movement.

This separation is important because:

> Prescription/refill creation is not the same thing as stock dispatch.

------------------------------------------------------------------------

# 8. Medication Adherence System

This is one of the more advanced features in the repository.

## 8.1 Medication schedules

A prescription can have structured schedules through
`MedicationSchedule`.

Supported concepts include:

-   Time of day
-   Dose quantity
-   Labels
-   Active/inactive schedules
-   Structured schedule generation
-   Schedule parsing from prescription text

The schedule service contains logic for:

-   Parsing dosage formulas
-   Parsing schedules from text
-   Calculating prescription metrics
-   Generating schedules
-   Creating daily dose reminders
-   Finding today's doses
-   Finding upcoming doses
-   Processing automatically missed doses
-   Settling open dose reminders

------------------------------------------------------------------------

## 8.2 Dose logs

`DoseLog` records:

-   Prescription
-   Customer
-   Schedule
-   Scheduled date
-   Scheduled time
-   Confirmation time
-   Status
-   Recorded by
-   Caregiver
-   Notes

This allows the system to distinguish:

-   Taken
-   Missed
-   Late
-   Open/unresolved states

------------------------------------------------------------------------

## 8.3 Adherence dashboard

The portal contains an adherence tracker.

The system can calculate:

-   Adherence rate
-   Taken count
-   Missed count
-   Late count
-   Current streak
-   Prescription-level adherence

------------------------------------------------------------------------

## 8.4 Reminder escalation

The schema contains `AdherenceEscalation`.

The system supports escalation steps linked to:

-   Dose
-   Reminder
-   Prescription
-   Customer
-   Scheduled date/time
-   Escalation action

This is intended to make adherence reminders progressive rather than
simply sending one notification.

------------------------------------------------------------------------

## 8.5 Caregiver adherence

Caregivers can log doses on behalf of patients if the permission:

`canLogAdherence`

is enabled.

Endpoints include:

-   `POST /api/portal/adherence`
-   `POST /api/caregiver/adherence`
-   `GET /api/caregiver/doses/today`
-   `GET /api/caregiver/patients/[id]/adherence-summary`

------------------------------------------------------------------------

# 9. Caregiver Platform

The caregiver system is not merely a second customer account. It has a
dedicated permission model.

## 9.1 Caregiver relationship

A caregiver can be linked to a customer/patient.

Stored information includes:

-   Caregiver name
-   Email
-   Phone
-   Relationship
-   Refill permission
-   Pickup notification permission
-   Adherence logging permission
-   Status
-   Invite tracking

------------------------------------------------------------------------

## 9.2 Caregiver invitation

Features:

-   Invite caregiver
-   Generate invitation
-   Token-based invitation
-   Expiration
-   Acceptance tracking
-   Invite resend/cooldown controls

Routes:

-   `/portal/caregivers`
-   `/caregiver/accept`

Actions:

-   `inviteCaregiverAction`
-   `acceptCaregiverInviteAction`
-   `generateCaregiverToken`

------------------------------------------------------------------------

## 9.3 Caregiver dashboard

Route:

`/caregiver`

Features:

-   Today's dose checklist
-   Patients being supported
-   Quick navigation to:
    -   Patients
    -   Refills
    -   Notifications
    -   Adherence

------------------------------------------------------------------------

## 9.4 Patient view

Route:

`/caregiver/patients/[id]`

Features:

-   Today's doses
-   Active medications
-   Refill requests
-   Pickup alerts
-   Upcoming reminders

------------------------------------------------------------------------

## 9.5 Caregiver refills

Routes:

-   `/caregiver/refills`
-   `/caregiver/refills/new`

Caregivers can request refills when permitted.

Backend:

`POST /api/caregiver/refill`

------------------------------------------------------------------------

## 9.6 Caregiver notifications

Route:

`/caregiver/notifications`

The caregiver can receive operational alerts for linked patients when
the corresponding permission is enabled.

------------------------------------------------------------------------

## 9.7 Caregiver AI privacy boundary

The AI context builder deliberately restricts caregiver AI context to
authorized linked patients.

It can expose, where authorized:

-   Active prescriptions
-   Dosage/schedule
-   Refill status
-   Adherence statistics
-   Recent dose logs

It explicitly prevents caregivers from accessing:

-   Other customers
-   CRM-wide data
-   Loyalty data
-   Campaigns
-   Admin operations

This is a strong architectural privacy boundary.

------------------------------------------------------------------------

# 10. Medication Catalogue and Inventory

The medication architecture has been deliberately split into:

1.  **MedicationMaster**
2.  **PharmacyInventory**

This is one of the most important architectural decisions in the
repository.

------------------------------------------------------------------------

## 10.1 MedicationMaster

Represents the reusable clinical/product definition.

Contains:

-   Name
-   Generic name
-   Brand name
-   Strength
-   Pack size
-   Dosage form
-   Route
-   Pregnancy category
-   Manufacturer
-   Country of origin
-   Barcode
-   Category
-   Description
-   Indications
-   Dosage
-   Side effects
-   Contraindications
-   Storage
-   Clinical notes
-   Images
-   Alternatives
-   Controlled-drug information
-   Pediatric use
-   Refrigeration requirement
-   Enrichment status
-   Acquisition method

------------------------------------------------------------------------

## 10.2 PharmacyInventory

Represents the pharmacy-specific commercial/stock record.

Contains:

-   Linked master medication
-   Pharmacy-specific slug
-   SKU
-   Selling price
-   Purchase price
-   Current stock
-   Low-stock threshold
-   Supplier
-   Shelf location
-   Promotions
-   OTC flag
-   Prescription-required flag
-   Public listing flag
-   Active status
-   POS sync timestamp

This separation lets the same clinical medicine definition be reused
without duplicating the full clinical record.

------------------------------------------------------------------------

# 11. Medication Acquisition Methods

The repository implements a multi-path medication entry strategy so
pharmacies are not forced to manually type everything.

## 11.1 Shared medication library

Route:

`/admin/medications/library`

Features:

-   Search shared medication masters
-   Search by:
    -   Name
    -   Generic
    -   Brand
    -   Barcode
-   Show:
    -   Strength
    -   Dosage form
    -   Manufacturer
    -   Category
    -   Enrichment score
    -   Active ingredients
    -   Already-stocked state
-   Add an existing master to pharmacy inventory

Endpoint:

`GET /api/admin/medications/library/search`

Add endpoint:

`POST /api/admin/medications/library/add`

------------------------------------------------------------------------

## 11.2 Barcode/QR-style acquisition

Route:

`/admin/medications/scan`

The implemented scanning mechanism uses the browser-native
`BarcodeDetector` API plus manual text entry.

This supports:

-   Camera scanning where supported
-   Hardware barcode scanners that act as keyboard input
-   Manual barcode entry
-   Lookup against `MedicationMaster.barcode`

Endpoint:

`GET /api/admin/medications/library/lookup?barcode=...`

If a barcode is not found, the UI provides an AI-import fallback.

------------------------------------------------------------------------

## 11.3 AI-assisted medication import

Route:

`/admin/medications/import/ai`

The AI import system is deliberately provider-agnostic.

It contains:

-   Versioned extraction prompt
-   Zod response schema
-   Copy-prompt flow
-   Photo guidance
-   Optional photo upload
-   Paste AI JSON response
-   JSON parsing
-   Validation
-   Review screen
-   Manual-entry fallback

Important architectural choice:

**The pharmacy system does not directly call an AI provider for this
import flow.**

Instead, the prompt/schema acts as the contract and allows the
pharmacy/operator to use an external AI assistant.

------------------------------------------------------------------------

## 11.4 CSV/Excel import

Route:

`/admin/medications/import/csv`

The import workflow supports:

-   File upload
-   CSV/Excel parsing
-   Arbitrary column mapping
-   Preview
-   Match-first import
-   Validation
-   Enrichment flagging

Matching attempts to reuse an existing medication master before creating
a new master.

This is important for avoiding duplicate medication records.

------------------------------------------------------------------------

## 11.5 Manual medication entry

Route:

`/admin/medications/new`

Features:

-   Full medication form
-   Five-section organization
-   Clinical fields
-   Commercial fields
-   Inventory settings
-   Media/relationships
-   Validation
-   Review-before-save

------------------------------------------------------------------------

## 11.6 POS integration

Endpoint:

`POST /api/integrations/pos`

The acquisition UI reserves POS sync as a future/coming-soon acquisition
option, while the backend integration endpoint already exists and can
write into the split medication/inventory architecture.

This means the repository has **integration scaffolding**, but the full
production POS ecosystem should be considered a separate integration
project.

------------------------------------------------------------------------

# 12. Medication Validation and Enrichment

## 12.1 Validation rules

The shared validation service checks:

-   Duplicate medication
-   Required fields
-   OTC/Rx conflicts
-   Barcode uniqueness
-   Generic/brand consistency
-   SKU uniqueness
-   Duplicate strength/form combinations
-   Controlled-drug schedule requirement

The shared function is:

`validateMedication()`

------------------------------------------------------------------------

## 12.2 Required medication fields

Core required fields include:

### Master

-   Name
-   Generic name
-   Dosage form
-   Slug

### Pharmacy inventory

-   Linked master
-   Slug
-   Price

------------------------------------------------------------------------

## 12.3 Review-before-save

Medication creation paths are designed to validate before committing.

The system supports:

-   Pass
-   Flag
-   Fail
-   Confirmation when flagged
-   Correction before save

------------------------------------------------------------------------

## 12.4 Progressive enrichment

Medication records can exist with incomplete data.

The system tracks:

-   `minimal`
-   `partial`
-   `complete`

and calculates an enrichment score from 0--100.

The enrichment queue is available at:

`/admin/medications/incomplete`

Metrics are available at:

`/admin/medications/metrics`

------------------------------------------------------------------------

# 13. Inventory Operations

Route:

`/admin/inventory`

The inventory system includes:

-   Current stock
-   Low-stock monitoring
-   Out-of-stock monitoring
-   Expiry monitoring
-   Reorder monitoring
-   Inventory health
-   Stock adjustments
-   Stock receiving
-   Lot management
-   Write-offs
-   Lot deactivation
-   Stock movement history

------------------------------------------------------------------------

## 13.1 Inventory lots

`InventoryLot` supports:

-   Batch number
-   Expiry date
-   Quantity
-   Received date
-   Active/inactive state

This enables lot-level expiry and recall operations.

------------------------------------------------------------------------

## 13.2 Stock movements

`StockMovement` records:

-   Inventory item
-   Lot
-   Reason
-   Quantity delta
-   Resulting balance
-   Notes
-   Related object
-   Actor
-   Timestamp

Reasons include concepts such as:

-   Sale
-   Receive
-   Adjust
-   Dispatch
-   Refill
-   POS sync
-   Return
-   Write-off

------------------------------------------------------------------------

## 13.3 FEFO stock deduction

The stock service contains `deductLotsFefo()`.

This indicates a **first-expiry-first-out** strategy for lot deduction,
which is appropriate for pharmaceutical inventory.

------------------------------------------------------------------------

## 13.4 Stock thresholds

The system can detect:

-   Low stock
-   Out of stock
-   Reorder conditions

and create threshold notifications.

There is also an inventory health scan cron endpoint.

------------------------------------------------------------------------

# 14. Prescription Management

Admin routes:

-   `/admin/prescriptions`
-   `/admin/prescriptions/new`
-   `/admin/prescriptions/[id]`

Features include:

-   Create prescription
-   Edit/view prescription
-   Link to medication catalogue
-   Rx reference
-   Dosage
-   Schedule
-   Quantity
-   Days of supply
-   Refills remaining
-   Last filled date
-   Next refill due
-   Start/end dates
-   Prescriber
-   Unit price
-   Notes
-   Status

------------------------------------------------------------------------

## 14.1 Prescription-to-stock relationship

A prescription can optionally reference:

`PharmacyInventory`

When a prescription is linked to inventory, dispatching it can decrement
stock.

The repository explicitly documents the distinction:

-   Prescription = authorization/clinical record
-   Dispatch = physical fulfilment
-   Dispatch = stock-changing event

This is a strong domain separation.

------------------------------------------------------------------------

# 15. Prescription Dispatch

Admin feature:

`adminDispatchPrescriptionAction`

Dispatch records:

-   Dispatch timestamp
-   Dispatcher
-   Prescription
-   Quantity/stock relationship

If linked to pharmacy inventory, dispatching is intended to create the
corresponding stock movement.

------------------------------------------------------------------------

# 16. Orders

Admin route:

`/admin/orders`

Customer routes:

-   `/portal/orders`
-   `/portal/orders/new`
-   `/order`

The order system supports:

-   Customer orders
-   Guest orders
-   Portal orders
-   Refill-linked orders
-   Counter/staff orders
-   Medicine line items
-   Pricing
-   Discounts
-   Coupons
-   Fulfilment state
-   Dispatch state
-   Waivers
-   Staff notes
-   Clinical/customer reason
-   Dispenser note

------------------------------------------------------------------------

## 16.1 Order sources

The model distinguishes:

-   `counter`
-   `portal`
-   `refill`
-   `website`

------------------------------------------------------------------------

## 16.2 Fulfilment modes

The order model supports:

-   Immediate
-   Reserve
-   Delivery

------------------------------------------------------------------------

## 16.3 Order statuses

The code documents:

-   Pending
-   Paid
-   Fulfilled
-   Cancelled
-   Waived

The domain distinction is:

-   Paid = payment received/stock reserved
-   Fulfilled = physical handoff/dispatch

------------------------------------------------------------------------

## 16.4 Waived orders

Admin can waive payment.

The system stores:

-   Waived state
-   Reason
-   Scope
-   Expiration for recurring waivers

Supported concepts include:

-   One-time
-   Recurring until a date
-   Permanent recurring waiver

This prevents waived transactions from being indistinguishable from
normal revenue.

------------------------------------------------------------------------

# 17. M-Pesa / Payment System

The repository contains a dedicated Daraja payment integration.

## 17.1 M-Pesa features

Supports:

-   STK Push
-   STK status polling
-   Callback handling
-   Payment retries
-   Attempt tracking
-   Provider reference
-   Merchant request ID
-   Checkout request ID
-   Failure reason
-   Phone normalization

Endpoints:

-   `POST /api/payments/daraja/stk`
-   `GET /api/payments/daraja/status`
-   `POST /api/payments/daraja/callback`

------------------------------------------------------------------------

## 17.2 Payment model

`Payment` stores:

-   Order
-   Customer
-   Amount
-   Provider
-   Status
-   Provider reference
-   Checkout request ID
-   Merchant request ID
-   Phone
-   Failure reason
-   Attempt count
-   Last attempt
-   Initiator
-   Timestamps

Providers include:

-   Daraja
-   Cash
-   Card
-   Other

------------------------------------------------------------------------

## 17.3 Retry behavior

The payment service includes:

-   Maximum-attempt protection
-   Pending-window handling
-   Payment state resolution
-   Retry tracking

This is more robust than treating every M-Pesa retry as an entirely new
payment.

------------------------------------------------------------------------

# 18. Pharmacy Services and Bookings

Admin routes:

-   `/admin/services`
-   `/admin/services/bookings`

Features:

-   Create service
-   Edit service
-   Delete service
-   Activate/deactivate
-   Sort services
-   Configure price
-   Configure booking availability
-   View bookings
-   Update booking status
-   Record booking payment

Service booking supports:

-   Name
-   Phone
-   Email
-   Notes
-   Preferred date
-   Preferred time
-   Payment state
-   Amount
-   Payment reference
-   Staff notes

Priced services can create/order through the payment system.

------------------------------------------------------------------------

# 19. CRM

The CRM layer is implemented through:

-   Customer profiles
-   Timeline events
-   Customer notes
-   Segments
-   Conversations
-   Messages
-   Enquiries
-   Feedback
-   Refill history
-   Orders
-   Prescriptions
-   Caregiver relationships

------------------------------------------------------------------------

## 19.1 Customer list

Admin:

`/admin/customers`

Features:

-   Customer listing
-   Search
-   Pagination
-   Customer metrics
-   Customer detail access

------------------------------------------------------------------------

## 19.2 Customer detail

Admin:

`/admin/customers/[id]`

The customer detail area can bring together:

-   Profile
-   Prescriptions
-   Refills
-   Orders
-   Timeline
-   Notes
-   Messages
-   Feedback
-   Caregiver links
-   Adherence information

------------------------------------------------------------------------

## 19.3 Customer notes

Admin note endpoints:

-   Create/update note
-   Delete note
-   Reorder notes

Notes support:

-   Pinning
-   Sort order
-   Author
-   Timestamp

------------------------------------------------------------------------

## 19.4 Timeline

`TimelineEvent` supports:

-   Event type
-   Title
-   Description
-   Metadata
-   Customer
-   User/staff actor
-   Timestamp

This allows the CRM to maintain a chronological customer interaction
history.

------------------------------------------------------------------------

# 20. Messaging and Inbox

Admin routes:

-   `/admin/inbox`
-   `/admin/messages`

Customer route:

-   `/portal/messages`

The communication system supports:

-   Conversations
-   Messages
-   Assignment
-   Channels
-   Inbound/outbound direction
-   Templates
-   Scheduling
-   Delivery state
-   Open/click/reply states

Supported channels include:

-   Email
-   SMS
-   WhatsApp
-   Portal
-   AI
-   System

------------------------------------------------------------------------

## 20.1 Templates

Admin:

`/admin/templates`

Templates support:

-   Name
-   Channel
-   Subject
-   Body
-   Category
-   Creator
-   Updater

The CRM service can interpolate customer variables into messages.

------------------------------------------------------------------------

# 21. Notifications

Admin:

`/admin/notifications`

Customer notification support exists through portal APIs/components.

Supported notification channels:

-   Email
-   SMS
-   WhatsApp
-   Push
-   In-app

Notification lifecycle:

-   Pending
-   Sent
-   Delivered
-   Failed
-   Opened
-   Clicked

Features include:

-   Read/unread state
-   Delete/dismiss
-   Retry failed notification
-   Full notification body
-   Related entity linking

Endpoints include:

-   `/api/notifications/unread`
-   `/api/notifications/read`
-   `/api/notifications/delete`
-   Admin notification read/delete/retry endpoints

------------------------------------------------------------------------

# 22. Push Notifications

The repository integrates Firebase Cloud Messaging.

Features:

-   Register device
-   Unregister device
-   Push test
-   Staff push
-   Customer push
-   Caregiver-related notifications
-   Medication reminders
-   Booking-related notifications
-   Browser service-worker endpoint

Endpoints:

-   `POST /api/push/register`
-   `POST /api/push/unregister`
-   `POST /api/push/test`
-   `GET /api/firebase-messaging-sw`

The code contains push asset URL handling and Firebase Admin dispatch
logic.

------------------------------------------------------------------------

# 23. Reminders

Admin:

`/admin/reminders`

Supported reminder types include:

-   Refill
-   Pickup
-   Follow-up
-   Wellness
-   Birthday
-   Custom
-   Medication dose

Reminder statuses include:

-   Scheduled
-   Sent
-   Cancelled
-   Failed
-   Answered
-   Escalated

Admin can create/process reminders.

The CRM service contains reminder processing logic, and there is a
dedicated cron endpoint:

`/api/cron/reminders`

------------------------------------------------------------------------

# 24. Marketing Campaigns

Admin:

`/admin/campaigns`

Features:

-   Campaign creation
-   Description
-   Channel
-   Target segment
-   Subject
-   Message body
-   Scheduling
-   Launch
-   Status
-   Campaign statistics

Supported channels:

-   Email
-   SMS
-   WhatsApp
-   Multi-channel

Campaign statuses:

-   Draft
-   Scheduled
-   Sending
-   Sent
-   Cancelled

Tracked statistics include:

-   Sent
-   Delivered
-   Opened
-   Clicked
-   Replied

------------------------------------------------------------------------

# 25. Customer Segmentation

Admin:

`/admin/segments`

Features:

-   Create segments
-   Segment descriptions
-   Rule JSON
-   System segments
-   Customer assignment
-   Campaign targeting

Customer-to-segment membership is modeled through `CustomerSegment`.

------------------------------------------------------------------------

# 26. Loyalty Program

Customer:

`/portal/loyalty`

Admin:

`/admin/loyalty`

The loyalty system supports:

-   Points balance
-   Lifetime points
-   Loyalty tier
-   Referral code
-   Referrer relationship
-   Point transactions
-   Manual adjustments
-   Earning
-   Redemption
-   Referral points
-   Bonus points
-   Loyalty rules

Tiers:

-   Bronze
-   Silver
-   Gold
-   Platinum

Transaction types:

-   Earn
-   Redeem
-   Adjust
-   Referral
-   Bonus

There is a loyalty cron endpoint:

`/api/cron/loyalty`

------------------------------------------------------------------------

# 27. Coupons

Coupons are supported as part of the loyalty/order ecosystem.

Admin functionality includes:

-   Create coupon
-   Update coupon
-   Delete coupon
-   Configure discount type
-   Configure discount amount
-   Configure points cost
-   Configure redemption limits
-   Configure validity
-   Activate/deactivate

Discount types:

-   Percent
-   Fixed
-   Points

The model also supports:

-   Global redemption limits
-   Per-customer redemption limits
-   Redemption counter

Customers can redeem coupons through:

`redeemCouponAction`

------------------------------------------------------------------------

# 28. Feedback and Enquiries

## 28.1 Feedback

Customer:

`/portal/feedback`

Admin:

`/admin/feedback`

Features:

-   Reviews
-   Suggestions
-   Complaints
-   Satisfaction feedback
-   Ratings
-   Staff response
-   Response timestamp
-   Public/private visibility

------------------------------------------------------------------------

## 28.2 Enquiries

Admin:

`/admin/enquiries`

Supported enquiry types:

-   General
-   Product availability
-   Delivery
-   Contact
-   Careers
-   Other

Statuses:

-   New
-   In progress
-   Resolved
-   Closed

Staff can:

-   Assign
-   Update status
-   Add staff notes

------------------------------------------------------------------------

# 29. AI Pharmacy Assistant

The repository contains a production-oriented AI assistant rather than a
generic chatbot.

## 29.1 Main AI chat

Endpoint:

`POST /api/chat`

The assistant is designed around a pharmacy-safe context.

It can use:

### Tool 1 --- Search medications

Searches publicly listed medication inventory.

Returns:

-   Product
-   Availability
-   Price
-   Public listing information

It explicitly prevents:

-   Exact stock disclosure
-   Supplier disclosure
-   Shelf location disclosure
-   Purchase price disclosure
-   Other customer information

### Tool 2 --- Get medication

Fetches a single public medicine listing by slug.

### Tool 3 --- Search knowledge

Searches approved pharmacy knowledge articles.

------------------------------------------------------------------------

## 29.2 AI safety boundaries

The AI is instructed not to:

-   Diagnose
-   Prescribe
-   Modify prescriptions
-   Make clinical decisions
-   Interpret lab results
-   Recommend specific medicine for symptoms
-   Reveal internal pharmacy operations

It can:

-   Explain pharmacy services
-   Provide pharmacy information
-   Search public medicine availability
-   Guide users toward refill/order/contact pages
-   Escalate clinical questions to a pharmacist

------------------------------------------------------------------------

## 29.3 Caregiver AI context

Caregiver AI sessions receive an additional scoped context containing
only authorized patient information.

This includes:

-   Prescriptions
-   Refills
-   Adherence
-   Recent dose logs

The AI is explicitly told not to disclose broader CRM/admin/customer
information.

------------------------------------------------------------------------

# 30. Guided "How Do You Feel?" Symptom System

Public route:

`/how-do-you-feel`

Portal route:

`/portal/feel`

Admin:

-   `/admin/feel`
-   `/admin/feel/[id]`

This is a dedicated symptom triage subsystem.

------------------------------------------------------------------------

## 30.1 Symptom sessions

A session can contain:

-   Guest key
-   Customer
-   User
-   Category
-   Chief complaint
-   Structured answers
-   AI summary
-   Provisional label
-   Severity
-   Feeling trend
-   Escalation reason
-   CRM conversation
-   Enquiry ticket
-   Check-in dates
-   Assigned staff member

------------------------------------------------------------------------

## 30.2 Supported symptom categories

The code documents categories such as:

-   Headache
-   Stomach
-   Cold/flu
-   Skin
-   Allergy
-   Other

------------------------------------------------------------------------

## 30.3 AI conversation

The system supports:

-   Text messages
-   Image attachments
-   AI replies
-   Rolling summaries
-   Red-flag detection
-   Escalation

Endpoint:

`POST /api/feel/chat`

------------------------------------------------------------------------

## 30.4 Red-flag escalation

The symptom service contains red-flag detection.

The system can escalate a session and link it into:

-   Staff workflow
-   CRM conversation
-   Enquiry ticket

Admin can then:

-   Acknowledge
-   Reply
-   Resolve/escalate

------------------------------------------------------------------------

## 30.5 Longitudinal check-ins

The system records:

-   Better
-   Same
-   Worse

and can schedule the next check-in.

This makes the feature more like a monitored symptom journey than a
one-off chatbot.

------------------------------------------------------------------------

# 31. AI Knowledge Base

Admin:

`/admin/knowledge`

The AI knowledge system supports:

-   Knowledge articles
-   Categories
-   Tags
-   Approval state
-   Priority
-   Authoring
-   Updating
-   Deletion
-   Search

Only approved knowledge is intended to be used by the customer-facing
assistant.

------------------------------------------------------------------------

# 32. Medication Image and AI Services

Beyond catalogue image search, the repository contains dedicated
medication AI utilities for:

-   Image validation
-   Vision model interaction
-   JSON extraction
-   Confidence normalization
-   Search-term cleaning
-   Candidate matching
-   Match scoring
-   Catalogue result conversion

This separates AI identification from pharmacy catalogue matching.

------------------------------------------------------------------------

# 33. Delivery and Communication Infrastructure

The delivery service supports:

-   Email
-   SMS
-   WhatsApp
-   Delivery messaging
-   Password reset emails
-   Email verification messages
-   HTML email rendering
-   Markdown-to-email conversion

There is also:

`POST /api/webhooks/delivery`

for delivery/provider callbacks.

------------------------------------------------------------------------

# 34. Pharmacy Location and Settings

Admin:

`/admin/settings/location`

`PharmacySettings` supports:

-   Display name
-   Phone
-   Email
-   WhatsApp
-   Address
-   City
-   State
-   ZIP
-   Country
-   Latitude
-   Longitude
-   Google Place ID
-   Maps embed URL
-   Opening hours
-   Last updater

The pharmacy settings service can build:

-   Full address
-   Google Maps embed
-   Directions links
-   Address-based directions

------------------------------------------------------------------------

# 35. Admin Dashboard

Route:

`/admin`

The admin dashboard surfaces operational shortcuts and indicators
including:

-   Inventory health
-   Low stock
-   Out of stock
-   Expiry
-   Reorder
-   Refills
-   AI
-   Campaigns
-   Customers
-   Operational notifications

The admin area is intended to act as the pharmacy's operational control
center.

------------------------------------------------------------------------

# 36. Admin Medication Pages

The medication module includes:

-   `/admin/medications`
-   `/admin/medications/add`
-   `/admin/medications/new`
-   `/admin/medications/[id]`
-   `/admin/medications/library`
-   `/admin/medications/scan`
-   `/admin/medications/import/ai`
-   `/admin/medications/import/csv`
-   `/admin/medications/incomplete`
-   `/admin/medications/categories`
-   `/admin/medications/metrics`

This is a substantial medication-management subsystem rather than a
simple CRUD page.

------------------------------------------------------------------------

# 37. Medication Categories

Admin:

`/admin/medications/categories`

`MedicationCategory` supports:

-   Name
-   Slug
-   Description
-   Image
-   Brands
-   Tips
-   Public visibility
-   Sort order
-   Active state

This category data feeds the public medicine browsing experience.

------------------------------------------------------------------------

# 38. Medication Relationships

The schema supports relational clinical metadata:

## Active ingredients

-   `ActiveIngredient`
-   `MedicationActiveIngredient`

Supports multi-ingredient medications.

## Manufacturers

-   `Manufacturer`

## Interactions

-   `MedicationInteraction`

Supports:

-   Severity
-   Description
-   Medication-to-medication relationships

## Clinical tags

-   `ClinicalTag`
-   `MedicationClinicalTag`

## Lookup data

`MedicationLookup` supports editable lookup values for:

-   Dosage form
-   Route
-   Pregnancy category

------------------------------------------------------------------------

# 39. Controlled Drugs and Clinical Flags

MedicationMaster includes:

-   Controlled drug boolean
-   Controlled-drug schedule
-   Pediatric use
-   Refrigeration requirement

Controlled-drug schedule validation prevents a controlled medicine from
being saved without the required schedule.

------------------------------------------------------------------------

# 40. Data Model Inventory

The repository contains 57 Prisma models.

### Identity

-   User
-   PushDevice
-   Session
-   PasswordReset
-   EmailVerification

### Customer

-   CustomerProfile
-   CustomerPreference

### Caregiver

-   Caregiver
-   CaregiverInvite

### Prescriptions/adherence

-   Prescription
-   PrescriptionAdherence
-   MedicationSchedule
-   DoseLog
-   AdherenceEscalation

### Refills

-   RefillRequest

### CRM

-   TimelineEvent
-   CustomerNote
-   Segment
-   CustomerSegment
-   Conversation
-   Message
-   MessageTemplate
-   Enquiry
-   Feedback

### Notifications

-   Notification
-   Reminder
-   AdminNotification

### Marketing

-   Campaign
-   LoyaltyAccount
-   LoyaltyTransaction
-   LoyaltyRule
-   Coupon

### AI

-   KnowledgeArticle
-   AiConversation
-   AiMessage

### Medication catalogue

-   MedicationCategory
-   MedicationMaster
-   PharmacyInventory
-   InventoryLot
-   StockMovement
-   ActiveIngredient
-   MedicationActiveIngredient
-   Manufacturer
-   MedicationInteraction
-   ClinicalTag
-   MedicationClinicalTag
-   MedicationLookup

### Commerce

-   Order
-   OrderItem
-   Payment

### Pharmacy services

-   PharmacyService
-   ServiceBooking

### Pharmacy configuration

-   PharmacySettings

### Symptom triage

-   SymptomSession
-   SymptomMessage
-   SymptomCheckIn

### Auditing

-   AuditLog

------------------------------------------------------------------------

# 41. API Surface Inventory

## Authentication

-   `GET /api/auth/google`
-   `GET /api/auth/google/callback`
-   `GET /api/verify-email`

## Public communication

-   `POST /api/contact`
-   `POST /api/careers`
-   `POST /api/delivery`
-   `POST /api/chat`

## Public medicine

-   `POST /api/medicines/image-search`

## Refills

-   `POST /api/refill`

## Orders

-   Delivery/order-related endpoints and server actions
-   Guest order server action

## Payments

-   `POST /api/payments/daraja/stk`
-   `GET /api/payments/daraja/status`
-   `POST /api/payments/daraja/callback`

## Push

-   `POST /api/push/register`
-   `POST /api/push/unregister`
-   `POST /api/push/test`

## Notifications

-   `GET /api/notifications/unread`
-   `POST /api/notifications/read`
-   `POST /api/notifications/delete`

## Caregiver

-   `POST /api/caregiver/adherence`
-   `GET /api/caregiver/doses/today`
-   `GET /api/caregiver/patients/[id]/adherence-summary`
-   `POST /api/caregiver/refill`

## Portal adherence

-   `POST /api/portal/adherence`

## Symptom triage

-   `GET/POST /api/feel/session`
-   `POST /api/feel/chat`
-   `POST /api/feel/check-in`
-   `POST /api/feel/escalate`
-   `POST /api/feel/upload`
-   `GET /api/feel/alerts`
-   `POST /api/feel/admin/ack`
-   `POST /api/feel/admin/reply`

## Medication admin

-   Bulk medication operations
-   Category management
-   AI import
-   CSV import
-   Library search
-   Library lookup
-   Library add
-   Validation
-   Uploads

## Admin operations

-   Coupon update/delete
-   Knowledge delete
-   Notes CRUD/reordering
-   Notification management
-   Refill updates
-   Template deletion

## Integrations

-   `POST /api/integrations/pos`
-   `POST /api/webhooks/delivery`

## Background jobs

-   `/api/cron/inventory`
-   `/api/cron/loyalty`
-   `/api/cron/reminders`

------------------------------------------------------------------------

# 42. Server Actions Inventory

## Authentication

-   `registerAction`
-   `loginAction`
-   `logoutAction`
-   `forgotPasswordAction`
-   `resetPasswordAction`

## Caregiver

-   `acceptCaregiverInviteAction`
-   `generateCaregiverToken`

## Admin

-   `adminUpdateRefillAction`
-   `adminEnquiryAction`
-   `adminFeedbackRespondAction`
-   `adminSendMessageAction`
-   `adminAddNoteAction`
-   `adminCreateCampaignAction`
-   `adminLaunchCampaignAction`
-   `adminCreateSegmentAction`
-   `adminKnowledgeAction`
-   `adminCreateReminderAction`
-   `adminProcessRemindersAction`
-   `adminCreateTemplateAction`
-   `adminAssignSegmentAction`
-   `adminLoyaltyAdjustAction`
-   `adminCreateCouponAction`
-   `adminCreatePrescriptionAction`
-   `adminDispatchPrescriptionAction`
-   `adminDeletePrescriptionAction`
-   `adminCreateMedicationAction`
-   `adminDeleteMedicationAction`
-   `adminCreateOrderAction`
-   `adminMarkOrderPaidAction`
-   `adminDispatchOrderAction`
-   `adminUndispatchOrderAction`
-   `adminWaiveOrderAction`
-   `adminReceiveStockAction`
-   `adminAdjustStockAction`
-   `adminDeactivateLotAction`
-   `adminWriteOffLotAction`

## Portal

-   `portalRefillAction`
-   `cancelRefillAction`
-   `updateProfileAction`
-   `updatePreferencesAction`
-   `addCaregiverAction`
-   `removeCaregiverAction`
-   `restoreCaregiverAction`
-   `inviteCaregiverAction`
-   `portalFeedbackAction`
-   `redeemCouponAction`
-   `portalReplyAction`
-   `portalCreateOrderAction`
-   `portalPayRefillAction`

## Pharmacy services

-   `saveServiceAction`
-   `deleteServiceAction`
-   `recordBookingPaymentAction`
-   `updateBookingStatusAction`

## Guest

-   `guestCreateOrderAction`

## Location

-   `savePharmacyLocationAction`

------------------------------------------------------------------------

# 43. Background/Automation Features

The codebase contains scheduled-job endpoints for:

### Inventory

`/api/cron/inventory`

Used for inventory health/threshold scanning.

### Loyalty

`/api/cron/loyalty`

Used for loyalty processing/rules.

### Reminders

`/api/cron/reminders`

Used to process due reminders.

### Adherence automation

The medication schedule/adherence services include automatic processing
for:

-   Missed doses
-   Open reminders
-   Dose reminder settlement
-   Escalation

------------------------------------------------------------------------

# 44. Security and Privacy Architecture

The code contains several useful security controls.

## Authentication

-   Hashed passwords
-   Hashed session tokens
-   Expiring reset tokens
-   Expiring email-verification tokens
-   Role-based access
-   Session claims

## API protection

Rate limiting exists on sensitive endpoints such as:

-   AI chat
-   Symptom chat
-   Image medicine search

## Data scoping

The code explicitly scopes:

-   Customer portal data to the authenticated customer
-   Caregiver data to linked patients
-   Admin routes to staff
-   Public AI tools to public catalogue data

## AI information boundaries

The AI is specifically instructed not to reveal:

-   Supplier information
-   Shelf location
-   Purchase price
-   Exact inventory counts
-   Other customer information
-   CRM/admin information

## Audit model

`AuditLog` exists for:

-   Actor
-   Action
-   Entity type
-   Entity ID
-   Details
-   IP
-   Timestamp

This provides the data structure required for operational traceability.

------------------------------------------------------------------------

# 45. Database Evolution

The migration history shows the platform evolved through several
substantial capability phases.

Key migrations include:

1.  Initial schema
2.  Push devices
3.  Tier 3 extension
4.  Caregiver invite cooldown
5.  Prescription-medication link
6.  Audit fixes
7.  Medication categories
8.  Caregiver adherence module
9.  Medication master/inventory split
10. Stock movements/inventory operations
11. Order fulfilment/payment retries
12. Symptom triage/location
13. Order dispenser notes/reason
14. Pharmacy services/category media

This progression confirms that the repository is not a basic template;
it has been incrementally expanded into a broader pharmacy operating
platform.

------------------------------------------------------------------------

# 46. Important Architectural Decisions Found in the Repository

## Medication master vs inventory split

Clinical medication information is separated from pharmacy-specific
commercial/inventory information.

## Single-pharmacy deployment

The code currently assumes a single pharmacy deployment rather than full
multi-tenant isolation.

## Existing medication IDs

The migration strategy preserves existing inventory IDs to reduce FK
breakage.

## Relational clinical data

Active ingredients, manufacturers, interactions and clinical tags are
modeled relationally.

## Editable lookup tables

Dosage forms, routes and pregnancy categories are lookup records rather
than hard-coded UI-only values.

## FEFO inventory

Lot deduction favors earliest-expiring stock.

## Review before medication save

Acquisition flows validate medication data before committing.

## Provider-agnostic AI import

The medication AI import does not hard-code a single AI vendor.

## Prescription != dispatch

Clinical authorization and physical stock movement are separate domain
operations.

## Payment != fulfilment

Payment and physical dispatch are separate states.

## Caregiver permissions

Caregiver relationships have explicit capabilities rather than blanket
access.

------------------------------------------------------------------------

# 47. Main UI/Component System

The repository contains reusable components for:

### Public

-   Navbar
-   Footer
-   PageHero
-   SectionHeading
-   CTA banners
-   Search panel
-   Medicine catalogue cards
-   Medicine filters
-   Medicine image search
-   Service booking
-   Contact forms
-   Delivery form
-   Guest order form
-   Refill form
-   FAQ accordion
-   AI chatbot
-   Push notification center

### Admin

-   Admin shell
-   Admin UI primitives
-   Medication form/catalog
-   Medication bulk actions
-   Inventory operations
-   Prescription form
-   Dispatch prescription form
-   Order form
-   Waive order form
-   Customer picker
-   Admin inbox
-   Message forms
-   Campaign form
-   Segment form
-   Loyalty form
-   Coupon form
-   Reminder form
-   Knowledge form
-   Template form
-   Notification panel
-   Symptom session tools
-   Adherence panel
-   Service manager
-   Booking panel
-   Location settings

### Portal

-   Portal shell
-   Portal widgets
-   Profile form
-   Preferences form
-   Refill form
-   Order form
-   Caregiver view
-   Caregiver invite
-   Loyalty redemption
-   Feedback
-   Messaging/reply
-   Notifications
-   Adherence tracker
-   Dose reminder banner
-   M-Pesa payment button

### Caregiver

-   Caregiver shell
-   Caregiver refill form
-   Dose confirmation button

------------------------------------------------------------------------

# 48. Public-to-Operational Feature Connections

One of the strongest aspects of the codebase is that many public
features connect to actual operational records.

Examples:

### Public medicine → inventory

`/medicines` reads public pharmacy inventory.

### Public refill → refill workflow

`/refill` creates real `RefillRequest` records.

### Portal refill → prescription

Customer refill can be connected to prescriptions.

### Prescription → inventory

A linked prescription can be dispatched against stock.

### Order → inventory

Order fulfilment can affect stock.

### Payment → order

M-Pesa payment is attached to an order/payment record.

### Service booking → order/payment

Paid pharmacy services can use the order/payment infrastructure.

### Symptom session → CRM

Escalated symptom sessions can create/link conversations and enquiries.

### AI → catalogue

AI can retrieve real public medicine availability rather than
hallucinating inventory.

### Caregiver → adherence

Caregiver permissions can directly control dose logging.

### Reminder → adherence

Medication schedules can generate reminders and escalation.

This indicates the platform is designed as an interconnected system
rather than a collection of disconnected pages.

------------------------------------------------------------------------

# 49. Areas That Are Clearly Present but Need Production Verification

The following are implemented in code but should be tested against real
infrastructure before being called production-ready.

## External AI

Requires valid Groq configuration and model availability.

Verify:

-   AI model configuration
-   Tool-call behavior
-   Vision model
-   Token limits
-   Error handling
-   Production rate limits

## M-Pesa

Requires live Daraja credentials and callback configuration.

Verify:

-   STK push
-   Callback signature/security assumptions
-   Retry behavior
-   Reconciliation
-   Duplicate callbacks
-   Payment/order consistency

## Firebase

Requires Firebase configuration.

Verify:

-   Browser permission flow
-   Token registration
-   Service worker
-   Push delivery
-   Token cleanup

## Object storage

Requires R2/S3 configuration.

Verify:

-   Upload permissions
-   Object lifecycle
-   Public/private URLs
-   File size enforcement
-   Image transformations if needed

## Email/SMS/WhatsApp

The communication abstraction exists, but provider configuration and
production deliverability need separate verification.

------------------------------------------------------------------------

# 50. Known/Notable Gaps and Caveats

## 50.1 POS integration

A POS endpoint exists, but the medication acquisition UI labels POS sync
as coming soon.

**Conclusion:** backend foundation exists; a full real-world POS
connector is not equivalent to having a completed POS integration.

------------------------------------------------------------------------

## 50.2 Multi-tenancy

The architecture is currently single-pharmacy.

There is no full `pharmacyId` tenancy boundary throughout the schema.

If this product becomes a SaaS platform for many pharmacies, a major
tenancy/security redesign will be required.

------------------------------------------------------------------------

## 50.3 Legal copy mismatch

The terms page contains a statement suggesting no online pharmacy
checkout, while current code includes:

-   Orders
-   Online order forms
-   M-Pesa
-   Payments
-   Fulfilment

The legal copy should be updated to match actual product behavior.

------------------------------------------------------------------------

## 50.4 AI medication import is operator-assisted

The AI medication import is intentionally provider-agnostic and does not
directly call an AI provider.

Therefore:

-   It is not an autonomous "upload photo and automatically populate"
    workflow by itself.
-   It provides the prompt/schema/parser/review infrastructure.
-   A future direct AI integration could automate the extraction step.

This is different from the public medicine image-search feature, which
does directly call the configured vision AI service.

------------------------------------------------------------------------

## 50.5 Runtime verification

Static source analysis cannot prove:

-   All pages render successfully
-   All DB migrations execute successfully on the target DB
-   All external integrations work
-   All payment callbacks work
-   Browser camera APIs work on every supported browser
-   Push notifications work on all target devices
-   All forms are visually correct
-   All error states are handled perfectly

These require actual environment/integration testing.

------------------------------------------------------------------------

# 51. Recommended Production Test Matrix

Before deployment, test at least:

## Authentication

-   Registration
-   Email verification
-   Login
-   Logout
-   Google login
-   Password reset
-   Expired session
-   Suspended account

## Customer

-   Onboarding
-   Profile
-   Preferences
-   Prescription visibility
-   Refill
-   Refill cancellation
-   Order
-   Payment
-   Loyalty
-   Coupon
-   Caregiver invitation
-   Messaging
-   Notifications
-   Adherence

## Caregiver

-   Accept invite
-   Permission restrictions
-   Multiple patients
-   Dose logging
-   Refill request
-   Pickup alerts
-   Unauthorized patient access
-   Caregiver AI privacy

## Admin

-   Customer management
-   Medication acquisition
-   Validation
-   Inventory
-   Lots
-   Stock adjustments
-   Prescription dispatch
-   Refill workflow
-   Order fulfilment
-   Payment reconciliation
-   Campaigns
-   Segments
-   Loyalty
-   Services
-   Symptom escalation

## AI

-   Medication lookup
-   Knowledge lookup
-   Availability hallucination protection
-   Clinical safety
-   Caregiver scoping
-   Image medicine search
-   Symptom escalation

## Payments

-   Successful STK
-   Failed STK
-   Timeout
-   Retry
-   Duplicate callback
-   Already-paid order
-   Waived order
-   Cash payment

## Inventory

-   Receive
-   Sell
-   Dispatch
-   Refill
-   Return
-   Write-off
-   Expired lot
-   FEFO deduction
-   Low-stock notification
-   Out-of-stock notification

------------------------------------------------------------------------

# 52. Feature Completeness Summary

  Domain                              Feature coverage in code
  ----------------------------------- ---------------------------------------------
  Public pharmacy website             Strong
  Public medicine catalogue           Strong
  Medicine detail/education           Strong
  Guest refills                       Implemented
  Guest orders                        Implemented
  Customer portal                     Strong
  Caregiver portal                    Strong
  Prescription management             Strong
  Refill workflow                     Strong
  Medication adherence                Strong
  Dose reminders                      Strong
  Caregiver permissions               Strong
  Medication master/inventory split   Strong
  Inventory lots                      Strong
  Stock movements                     Strong
  FEFO deduction                      Implemented
  Medication acquisition library      Strong
  Barcode acquisition                 Implemented
  AI-assisted import                  Implemented, operator-assisted
  CSV/Excel import                    Implemented
  Medication validation               Strong
  Progressive enrichment              Implemented
  POS integration                     Backend foundation / not complete UX
  Orders                              Strong
  M-Pesa                              Implemented, requires live verification
  Loyalty                             Strong
  Coupons                             Strong
  CRM                                 Strong
  Messaging                           Strong
  Campaigns                           Strong
  Segmentation                        Implemented
  Notifications                       Strong
  Push notifications                  Implemented, requires Firebase verification
  Pharmacy services                   Strong
  Service bookings                    Strong
  Symptom triage                      Strong
  AI pharmacy assistant               Strong
  AI knowledge base                   Implemented
  Image medicine search               Implemented
  Delivery integration                Implemented foundation
  Pharmacy location/settings          Implemented
  Audit logging                       Data model + supporting implementation
  Multi-pharmacy tenancy              Not implemented

------------------------------------------------------------------------

# 53. Overall Assessment

The uploaded repository should be understood as a **pharmacy digital
operating platform**, not simply a pharmacy marketing website.

Its feature architecture covers three connected layers:

``` text
CUSTOMER EXPERIENCE
        |
        v
Public Website
Customer Portal
Caregiver Portal
        |
        v
TRANSACTION + CARE LAYER
        |
        +-- Prescriptions
        +-- Refills
        +-- Orders
        +-- Payments
        +-- Adherence
        +-- Reminders
        +-- Services
        +-- Loyalty
        |
        v
PHARMACY OPERATIONS
        |
        +-- Medication catalogue
        +-- Inventory
        +-- Lots
        +-- Stock movements
        +-- Customer CRM
        +-- Communications
        +-- Campaigns
        +-- Enquiries
        +-- Symptom escalation
        +-- AI knowledge
        |
        v
INTEGRATIONS
        |
        +-- Groq
        +-- Firebase
        +-- Google
        +-- M-Pesa Daraja
        +-- S3/R2
        +-- POS
        +-- Delivery webhooks
```

The strongest parts of the implementation are:

1.  **Medication master/inventory separation**
2.  **Inventory lot and movement tracking**
3.  **Prescription/refill/dispatch separation**
4.  **Structured medication adherence**
5.  **Caregiver permission model**
6.  **AI with explicit pharmacy-safe boundaries**
7.  **Symptom triage with escalation into staff workflows**
8.  **Real customer-to-pharmacy CRM connectivity**
9.  **Multiple medication acquisition methods**
10. **M-Pesa/order/fulfilment integration**
11. **Progressive medication enrichment**
12. **Broad notification and communication infrastructure**

The most significant architectural limitation is that the repository is
currently designed for a **single pharmacy**, despite having a shared
medication-master concept that could later support a broader
multi-pharmacy architecture.

------------------------------------------------------------------------

# 54. Final Feature Map

At a business level, the code currently supports the following
end-to-end journeys:

### Customer

``` text
Discover pharmacy
    ↓
Browse medicines/services
    ↓
Ask AI / search catalogue
    ↓
Request refill OR place order
    ↓
Pay by M-Pesa where applicable
    ↓
Pharmacy processes request
    ↓
Stock is prepared/dispatched
    ↓
Customer receives notifications
    ↓
Customer can track/refill again
    ↓
Adherence + reminders support ongoing treatment
```

### Caregiver

``` text
Customer invites caregiver
    ↓
Caregiver accepts invitation
    ↓
View authorized patient(s)
    ↓
See medications + today's doses
    ↓
Confirm doses
    ↓
Monitor adherence
    ↓
Request refills when permitted
    ↓
Receive pickup/reminder notifications
```

### Pharmacy staff

``` text
Customer/order/refill arrives
    ↓
CRM + prescription context
    ↓
Review medication/prescription
    ↓
Prepare stock
    ↓
Stock movement recorded
    ↓
Payment confirmed/waived
    ↓
Dispatch/fulfil
    ↓
Customer notified
    ↓
Timeline/operational records updated
```

### Medication onboarding

``` text
Shared library
      OR
Barcode
      OR
AI-assisted import
      OR
CSV/Excel
      OR
Manual entry
      OR
POS integration foundation
      ↓
Validation
      ↓
Review
      ↓
MedicationMaster
      +
PharmacyInventory
      ↓
Progressive enrichment
      ↓
Public catalogue / prescribing / inventory / orders
```

------------------------------------------------------------------------

## Bottom line

**This repository already contains the foundations of a complete digital
pharmacy ecosystem: public discovery, customer self-service, caregiver
support, pharmacy operations, inventory, prescriptions, refills,
adherence, payments, CRM, communications, loyalty, services and AI.**

The next major step should not be simply adding more pages. The
highest-value work is likely to be **hardening the existing workflows,
validating every cross-module transaction, closing UX/error-state gaps,
verifying external integrations, and ensuring the legal/business rules
match the actual implemented capabilities.**
