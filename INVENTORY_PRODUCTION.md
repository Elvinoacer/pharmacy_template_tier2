# Inventory & Medication Ops — Production Close-Out

**Status:** Production-ready inventory loop (stock truth, refills, OTC, alerts, guest buy).

This document records what was closed to bring the medication system from “catalog + CRM” to full operational inventory.

---

## What ships

### Central stock service (`app/lib/services/stock.ts`)
- Atomic decrements (`updateMany` with `currentStock >= qty`) — no race to negative
- FEFO lot deduction when `InventoryLot` rows exist
- `StockMovement` ledger on every change (sale, receive, adjust, dispatch, refill, POS, return, write-off)
- Low/out-of-stock admin notifications when thresholds are crossed
- `getInventoryHealth()` — low, out, expiring, expired, reorder suggestions (30d velocity)
- `runInventoryHealthScan()` — cron-safe, 24h deduped alerts

### Schema
- `StockMovement` model + migration `20260805140000_stock_movements_inventory_ops`
- `InventoryLot` fully wired (receive creates/merges lots; sales FEFO; write-off)

### Wired paths
| Path | Stock effect |
|---|---|
| Counter OTC/Rx sale | −qty, movement `sale`, low-stock notify |
| Portal OTC order | same |
| Guest `/order` OTC | same (no account) |
| Prescription dispatch | −qty once, movement `dispatch` |
| Refill → preparing / ready / collected | −qty once (or link to prior dispatch), order auto-created, refillsRemaining |
| Refill → cancelled | +qty restock if previously deducted; pending order cancelled |
| POS sync | absolute set via movement `pos_sync`; clinical master never overwritten |
| Admin receive | +qty + optional batch/expiry lot |
| Admin adjust / stocktake / write-off | signed or absolute + required audit note |

### Admin UX
- `/admin/inventory` — health dashboard (low / out / expiry / reorder)
- Medication edit page — **Inventory operations** panel (receive, adjust, lots, history)
- Main analytics dashboard — inventory KPI strip
- Sidebar: **Inventory health**
- Refill status UI surfaces insufficient-stock errors clearly

### Customer / visitor
- Public product pages: **Buy now — no account** → `/order`
- Guest order form: name + phone, rate-limited, **reserves stock**, optional M-Pesa STK (no account)
- Soft login nudge for dose reminders — never blocks checkout
- Portal checkout for logged-in M-Pesa / loyalty
- Remote paid orders stay **awaiting dispatch** until staff handoff

### Payments (Daraja)
- Counter: pharmacist enters phone → STK → customer PIN → webhook or status poll
- OTC counter: **auto-dispatch on pay** (checkbox to hold instead)
- Remote/guest/portal: fulfillment=`reserve` until admin **Mark dispatched**
- Retries: max 5 STK/hour/order; stale pending auto-expires ~90s; force retry for staff
- APIs: `POST /api/payments/daraja/stk`, `GET /api/payments/daraja/status?query=1`, callback

### Cron
- `POST /api/cron/inventory` (+ `.github/workflows/cron-inventory.yml` every 6h)
- Auth: `Authorization: Bearer $CRON_SECRET`

---

## Ops checklist (go-live)

1. `npx prisma migrate deploy` (applies stock_movements + order_fulfillment_payment_retries)
2. Set `CRON_SECRET` and schedule inventory cron (or rely on GitHub Action + `APP_URL`)
3. Set `DARAJA_*` + public `DARAJA_CALLBACK_URL` for live M-Pesa
4. Receive opening stock **with batch + expiry** on high-value SKUs
5. Set realistic `lowStockThreshold` per item
6. Train staff: advance refill to **Preparing** only when ready to commit stock; cancel restores stock
7. Train counter: M-Pesa STK + auto-dispatch checkbox; remote paid → Mark dispatched on collection
8. Prefer **Receive** over editing `currentStock` on the form (ledger stays honest)

---

## Known intentional limits

- Single-pharmacy (no multi-tenant `pharmacyId`) — by design (DECISIONS D2)
- Guest identity for pay is **phone match** on the order (no forced account)
- Positive stock adjust without a lot does not invent a batch (use **Receive** for goods-in)
- FEFO restock on cancel returns to aggregate only (lot qty not reconstructed) — acceptable for v1
- Full PO/supplier email workflow is suggestion-list only (reorder table), not purchase-order documents
