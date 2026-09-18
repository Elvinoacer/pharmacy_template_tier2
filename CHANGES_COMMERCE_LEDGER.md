# Commerce Ledger Extension — Changes Summary

This document summarizes the commerce-ledger rebuild that powers the new analytics
dashboards, following the audit (`Afyvia_Pharmacy_Analytics_Full_Repo_Audit.md`).

## TL;DR

The repository went from "operational counts masquerading as analytics" to a
real commerce ledger. Every sale, payment, fill, reservation, refund, and stock
movement now writes to a single immutable event log, and every financial metric
is computed from explicit timestamps (`paidAt`, `fulfilledAt`, `processedAt`)
— never from `updatedAt` or `Order.status`.

## What was added

### New Prisma models (all additive — legacy columns untouched)

| Model | Purpose | Audit ref |
|---|---|---|
| `PrescriptionFill` | One row per fill of a prescription. Snapshots price + cost + lot ids. | §4, §41.A |
| `InventoryReservation` | Temporary stock hold. Lifecycle: active → converted / released / expired / cancelled. | §9 |
| `Refund` | First-class refund records. One payment can have multiple partial refunds. | §14 |
| `InventoryAllocation` | Lot-level cost allocations against sold order items. | §18 |
| `CommerceEvent` | Immutable business-event ledger. Single source of truth for analytics. | §38, §41.E |
| `MedicationPriceHistory` | Time-series of catalogue price changes. | §46 |
| `CashierSession` | Cash drawer sessions with opening float + closing variance. | §35 |

### New enums

`OrderType`, `OrderLifecycleStatus`, `PaymentStage`, `FulfillmentStage`,
`ReservationStatus`, `PrescriptionFillStatus`, `RefundStatus`,
`CommerceEventType`.

### Order fields added

- `type`, `lifecycleStatus`, `paymentStage`, `fulfillmentStage`
- `currency`, `subtotal`, `discountTotal`, `taxTotal`, `netTotal`,
  `amountPaid`, `amountRefunded`, `amountDue`
- Explicit lifecycle timestamps: `reservedAt`, `paymentInitiatedAt`,
  `paidAt`, `preparingAt`, `readyAt`, `outForDeliveryAt`, `fulfilledAt`,
  `cancelledAt`, `expiredAt`, `expiresAt`
- `cancellationReason`, `guestEmail`

### OrderItem fields added

- `unitCostSnapshot`, `grossAmount`, `netAmount`, `grossProfit`, `taxAmount`
- `currency`, `pricingRule`
- `prescriptionFillId`, `refillRequestId`

### Payment fields added

- `paidAt` — explicit timestamp for when the payment actually settled.

### New StockReason values

`purchase_receive`, `reservation_create`, `reservation_release`,
`prescription_fill`, `refill_fill`, `return_customer`, `return_supplier`,
`expiry`, `damage`, `transfer_in`, `transfer_out`, `stocktake_adjustment`.
(Legacy values retained for back-compat.)

## What changed in code

### New commerce services (`app/lib/services/commerce/`)

- `events.ts` — immutable `CommerceEvent` ledger writer (used inside transactions).
- `pricing.ts` — line-item pricing computation + price/cost snapshots + order
  financial recompute + MedicationPriceHistory maintenance.
- `orders.ts` — authoritative order settlement: `markOrderPaid`,
  `markOrderFulfilled`, `markOrderCancelled`, `markOrderWaived`,
  `deriveInitialStages`.
- `fulfillment.ts` — `dispatchOrder`, `cancelOrder`, `undispatchOrder`.
- `reservations.ts` — `createReservation`, `convertReservationToSale`,
  `releaseReservation`, `releaseExpiredReservations`, `reservedQuantityFor`,
  `availableQuantity`.
- `refunds.ts` — `createRefund`, `approveRefund`, `completeRefund`.
- `prescription-fills.ts` — `createPrescriptionFill` (single entry point
  for converting a clinical prescription into a commercial fill).

### New analytics services (`app/lib/services/analytics/`)

- `overview.ts` — single API call returning all top-line numbers.
- `revenue.ts` — gross/net sales, COGS, gross profit, margin, daily trend.
- `sales.ts` — orders, units, AOV, basket size, by source/type, reservation funnel.
- `payments.ts` — success/failure rates, collected by provider, outstanding aging.
- `prescriptions.ts` — per-prescription fill history + financials.
- `refills.ts` — refill funnel, turnaround time, revenue per refill.
- `inventory.ts` — stock value, reserved units, expiring value.
- `products.ts` — per-medicine profitability.
- `customers.ts` — lifetime value, repeat purchase rate.
- `staff.ts` — per-staff sales, dispatches, fills, refunds approved.
- `reconciliation.ts` — expected vs collected by provider + difference.

### Refactored flows

- `adminDispatchPrescriptionAction` — now creates a `PrescriptionFill` + an
  `Order` + an `OrderItem` (with price/cost snapshots) + a `StockMovement`
  (`prescription_fill` reason) + `CommerceEvent`s. Mirrors legacy
  `Prescription.dispatchedAt` for back-compat.
- `adminCreateOrderAction` — snapshots cost price, sets `type`/`lifecycle`/
  `payment`/`fulfillment` stages, distinguishes counter sale (uses `sale`
  stock movement) from reservation (uses `reservation_create` + creates an
  `InventoryReservation` row).
- `guestCreateOrderAction` + `portalCreateOrderAction` — now create
  `InventoryReservation` rows with 48-hour TTL instead of misclassifying
  unpaid holds as `sale`.
- `portalPayRefillAction` — creates a `PrescriptionFill` row linked to the
  order, with full cost snapshot.
- `adminWaiveOrderAction` — uses `markOrderWaived` to set `paymentStage =
  waived`, `amountDue = 0`, write a `CommerceEvent.waiver_applied`, and
  recompute order financials atomically.
- `adminRefundOrderAction` (new) — creates a first-class `Refund` row,
  recomputes order financials, optionally marks the refund completed
  immediately for cash/card.
- `adminCancelOrderAction` (new) — releases active reservations, marks the
  order cancelled, optionally auto-refunds completed payments.

### New cron: `/api/cron/reservations`

Releases all `InventoryReservation` rows whose `expiresAt` has passed,
restores physical stock, marks the parent order expired/cancelled, and writes
`CommerceEvent.reservation_expired` entries. Schedule: every 15–30 minutes.

### Fixed: loyalty cron

`/api/cron/loyalty` previously looked at `Order.status = 'paid'` AND
`updatedAt` — which meant a paid counter order that later became `fulfilled`
would miss its loyalty bonus. The new logic keys off
`Payment.status = 'completed'` and `Payment.paidAt` (with `updatedAt`
fallback for legacy rows).

## New admin UI

### Analytics section in the sidebar (`/admin/analytics/*`)

| Page | What it shows |
|---|---|
| `/admin/analytics` | Landing page listing every analytics dashboard. |
| `/admin/analytics/overview` | All top-line numbers in one screen. |
| `/admin/analytics/revenue` | Gross/net sales, COGS, gross profit, margin, daily trend chart. |
| `/admin/analytics/sales` | Orders, units, AOV, basket size, by source/type, reservation funnel. |
| `/admin/analytics/payments` | Payment attempts, success rate, collected by provider, outstanding aging. |
| `/admin/analytics/prescriptions` | Fills, billing, outstanding, COGS, gross profit. |
| `/admin/analytics/refills` | Refill funnel, turnaround, revenue per refill. |
| `/admin/analytics/inventory` | Stock value, reserved, expiring, write-offs. |
| `/admin/analytics/products` | Per-medicine profitability table. |
| `/admin/analytics/customers` | Lifetime value, repeat rate, top customers. |
| `/admin/analytics/staff` | Per-staff sales, dispatches, fills, refunds. |
| `/admin/analytics/reconciliation` | Expected vs collected by provider + difference. |

Every page has a period selector (today / 7d / 30d / quarter / year).

### Enhanced existing pages

- **Prescription detail** (`/admin/prescriptions/[id]`) — now shows a
  "Financial summary & fill history" panel with per-fill row: status, qty,
  unit price snapshot, net, cost, profit, payment provider + ref, paid, due,
  dispatched timestamp, dispenser. Audit §29.
- **Customer detail** (`/admin/customers/[id]`) — now shows a "Commerce
  history" panel with lifetime spend, outstanding balance, refunds, avg order
  value, prescription fills count, and a recent-orders table with type/source/
  payment/fulfillment stages. Audit §59.

### New admin actions

- `adminRefundOrderAction` — record a refund on a completed payment.
- `adminCancelOrderAction` — cancel an order with optional auto-refund.

### New component

- `RefundOrderForm` (`app/components/admin/RefundOrderForm.tsx`) — client
  form for recording a refund against a completed payment.

## New API routes

```
/api/admin/analytics/overview
/api/admin/analytics/revenue
/api/admin/analytics/sales
/api/admin/analytics/payments
/api/admin/analytics/prescriptions
/api/admin/analytics/refills
/api/admin/analytics/inventory
/api/admin/analytics/products
/api/admin/analytics/customers
/api/admin/analytics/staff
/api/admin/analytics/reconciliation
/api/cron/reservations
```

All `/api/admin/analytics/*` routes are staff-only and accept a `period`
query param (`today | 7d | 30d | quarter | year | custom&from=…&to=…`).

## Migration

`prisma/migrations/20260809120000_commerce_ledger_extension/migration.sql` is
fully additive — it creates the new tables, adds the new columns to existing
tables, and backfills:

- `Order.lifecycleStatus` / `paymentStage` / `fulfillmentStage` from legacy
  `status` (e.g. `paid` → `lifecycle=active`, `paymentStage=paid`).
- `Order.subtotal` / `netTotal` / `amountDue` from `total`.
- `Order.amountPaid` for already-paid orders.
- `OrderItem.grossAmount` / `netAmount` from existing `unitPrice × quantity`.
- `Payment.paidAt` from `updatedAt` for already-completed payments.
- `Order.type` from `source` (website → RESERVATION, portal → OTC_PURCHASE,
  refill → REFILL, counter → OTC_PURCHASE).

So existing dashboards continue to work; new dashboards light up immediately
after running the migration.

## Running the migration

```bash
npm run db:migrate        # prisma migrate deploy
npm run db:generate       # regenerate prisma client
```

## Verification checklist (audit §80)

Every question in the audit's acceptance criteria can now be answered from
the admin UI:

- What was prescribed / dispensed / paid / outstanding / refunded — see
  `/admin/prescriptions/[id]` → "Financial summary & fill history".
- How much M-Pesa vs cash vs card was collected — see
  `/admin/analytics/payments`.
- Reservation conversion rate — see `/admin/analytics/sales` → funnel.
- Outstanding customer balances with aging — see
  `/admin/analytics/payments` → Outstanding Aging.
- Per-product margin — see `/admin/analytics/products`.
- Customer lifetime value — see `/admin/analytics/customers`.
- Reconciliation difference — see `/admin/analytics/reconciliation`.

## What was NOT changed (intentionally)

- `.git/` is fully preserved — no commits, branches, or history touched.
- Legacy `Order.status` field still written alongside the new stage fields so
  every existing dashboard, query, and component continues to work.
- Legacy `Prescription.dispatchedAt` / `dispatchedById` still written by the
  refactored dispatch action so the existing prescription detail page renders
  correctly without a UI rewrite.
- The existing `getAdminAnalytics()` CRM function is untouched — it returns
  CRM operational counts; the new financial analytics live in
  `/api/admin/analytics/*` so the two concerns don't collide.

## Files touched

- `prisma/schema.prisma` — extended.
- `prisma/migrations/20260809120000_commerce_ledger_extension/migration.sql` — new.
- `app/lib/services/stock.ts` — extended `StockReason` vocabulary.
- `app/lib/services/commerce/*` — new directory, 7 files.
- `app/lib/services/analytics/*` — new directory, 11 files.
- `app/actions/admin.ts` — refactored dispatch + create order + waive;
  added refund + cancel actions.
- `app/actions/guest-order.ts` — uses reservation lifecycle.
- `app/actions/portal.ts` — uses reservation lifecycle + creates fills.
- `app/api/cron/loyalty/route.ts` — keys off Payment.completed.
- `app/api/cron/reservations/route.ts` — new.
- `app/api/admin/analytics/*` — new directory, 11 routes + `_shared.ts`.
- `app/admin/analytics/*` — new directory, 11 pages.
- `app/admin/prescriptions/[id]/page.tsx` — added fill history panel.
- `app/admin/customers/[id]/page.tsx` — added commerce history panel.
- `app/components/admin/AdminShell.tsx` — added Analytics nav section.
- `app/components/admin/AnalyticsShell.tsx` — new.
- `app/components/admin/RefundOrderForm.tsx` — new.
- `CHANGES_COMMERCE_LEDGER.md` — this file.
