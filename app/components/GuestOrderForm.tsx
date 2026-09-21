"use client";

import { useActionState, useEffect, useState } from "react";
import TenantLink from "./TenantLink";
import Link from "next/link";
import {
  guestCreateOrderAction,
  searchGuestOtcAction,
  type GuestOrderState,
} from "@/app/actions/guest-order";
import { toast } from "@/app/components/Toaster";
import { MpesaPayButton } from "@/app/components/portal/MpesaPayButton";
import {
  AlertCircle,
  Check,
  Hash,
  Phone,
  User,
  Mail,
  Send,
  ShoppingBag,
  Bell,
  X,
  Smartphone,
  Search,
} from "lucide-react";

type Med = { id: string; name: string; price: number; stockQty: number; slug: string };

export function GuestOrderForm({
  medications,
  onlinePaymentsEnabled = false,
  defaultMedicationId,
  isLoggedIn = false,
  supportsDelivery = false,
  deliveryNotes,
  deliveryRadiusKm,
  pharmacyId,
  pharmacySlug,
}: {
  medications: Med[];
  onlinePaymentsEnabled?: boolean;
  defaultMedicationId?: string;
  isLoggedIn?: boolean;
  supportsDelivery?: boolean;
  deliveryNotes?: string | null;
  deliveryRadiusKm?: number | null;
  pharmacyId?: string;
  pharmacySlug?: string;
}) {
  const [state, formAction, pending] = useActionState(guestCreateOrderAction, {} as GuestOrderState);
  const [medicationId, setMedicationId] = useState(
    defaultMedicationId || medications[0]?.id || "",
  );
  const [productSearch, setProductSearch] = useState("");
  const [catalog, setCatalog] = useState(medications);
  const [quantity, setQuantity] = useState(1);
  const [payNow, setPayNow] = useState(onlinePaymentsEnabled);
  const [showLoginNudge, setShowLoginNudge] = useState(!isLoggedIn);

  const selected = catalog.find((m) => m.id === medicationId) || medications.find((m) => m.id === medicationId);
  const total = selected ? selected.price * quantity : 0;

  // Clamp quantity whenever selected medication changes or has lower stock
  useEffect(() => {
    setCatalog(medications);
  }, [medications]);

  const handleMedicationChange = (newId: string) => {
    setMedicationId(newId);
    const target = catalog.find((m) => m.id === newId) || medications.find((m) => m.id === newId);
    if (target) {
      const maxForTarget = Math.max(1, Math.min(20, target.stockQty));
      if (quantity > maxForTarget) {
        setQuantity(maxForTarget);
      }
    }
  };

  useEffect(() => {
    if (selected) {
      const maxAvailable = Math.max(1, Math.min(20, selected.stockQty));
      if (quantity > maxAvailable) {
        setQuantity(maxAvailable);
      }
    }
  }, [selected, quantity]);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  useEffect(() => {
    if (!pharmacyId) {
      const q = productSearch.trim().toLowerCase();
      setCatalog(
        q ? medications.filter((item) => item.name.toLowerCase().includes(q)) : medications,
      );
      return;
    }
    const timer = window.setTimeout(() => {
      void searchGuestOtcAction(pharmacyId, productSearch).then((rows) => {
        setCatalog((current) => {
          const selectedRow =
            medications.find((item) => item.id === medicationId) ||
            current.find((item) => item.id === medicationId);
          const next = [...rows];
          if (selectedRow && !next.some((item) => item.id === selectedRow.id)) {
            next.unshift(selectedRow);
          }
          return next;
        });
      }).catch(() => toast.error("Could not search medicines. Please try again."));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [pharmacyId, productSearch, medications, medicationId]);

  // ── Success: reservation + optional M-Pesa ──────────────────
  if (state?.success && state.orderId) {
    return (
      <div className="space-y-4">
        <div className="liquid-glass rounded-2xl border border-emerald-700/60 bg-emerald-500/10 p-6 text-center text-[var(--foreground)] dark:border-emerald-300/60">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-700/60 bg-emerald-700 text-white shadow-sm dark:border-emerald-300/60">
            <Check className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">Order reserved</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">{state.success}</p>
          <p className="mt-3 font-mono text-sm font-bold text-emerald-800 dark:text-emerald-100">
            Ref: {state.orderId.slice(0, 8).toUpperCase()}
          </p>
          {state.total != null && (
            <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
              KES {state.total.toLocaleString()}
            </p>
          )}
        </div>

        {state.onlinePaymentsEnabled && <>
        {/* Pay now — no account needed; phone already on the order */}
        <div className="rounded-2xl border border-[var(--public-flow-ui-border)] bg-[var(--card)] p-5 text-[var(--foreground)] shadow-sm">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <Smartphone className="h-4 w-4 text-[var(--brand)]" />
            Pay with M-Pesa
          </h4>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Optional — you can also pay when you collect. Stock is already held for you.
          </p>
          <div className="mt-3">
            <MpesaPayButton
              orderId={state.orderId}
              accessToken={state.accessToken}
              defaultPhone={state.phone || ""}
              guestMode
            />
          </div>
        </div>

        </>}

        {/* Soft account nudge — never blocks purchase */}
        {state.suggestAccount && (
          <div className="rounded-2xl border border-[var(--public-flow-ui-border)] bg-[var(--brand-soft)]/20 p-5 text-[var(--foreground)]">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <Bell className="h-4 w-4 text-[var(--brand)]" />
              Want dose reminders later?
            </h4>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Creating a free account is optional. It unlocks refill history, loyalty, and
              medication reminders — your reservation already stands without one.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/register" className="btn-primary !py-2 text-sm">
                Create free account
              </Link>
              <TenantLink href="/medicines" className="btn-ghost btn-ghost-sm">
                Browse more
              </TenantLink>
            </div>
          </div>
        )}

        {!state.suggestAccount && (
          <div className="flex flex-wrap justify-center gap-3">
            <TenantLink href="/medicines" className="btn-primary btn-primary-sm">
              Browse more
            </TenantLink>
            <Link href="/portal/orders" className="btn-ghost !py-2 text-sm">
              View my orders
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (medications.length === 0) {
    return (
      <div className="rounded-xl border border-amber-700/60 bg-amber-500/10 px-4 py-4 text-sm text-amber-900 dark:border-amber-300/60 dark:text-amber-100">
        No OTC products are currently available with unreserved stock for online order. Please visit the pharmacy or call us.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 text-[var(--foreground)]">
      {pharmacyId ? <input type="hidden" name="pharmacyId" value={pharmacyId} /> : null}
      {pharmacySlug ? <input type="hidden" name="pharmacySlug" value={pharmacySlug} /> : null}
      {/* Soft login nudge — dismissible, never blocks checkout */}
      {showLoginNudge && !isLoggedIn && (
        <div className="relative rounded-xl border border-[var(--public-flow-ui-border)] bg-[var(--brand-soft)]/20 px-3 py-2.5 pr-9 text-sm text-[var(--foreground)]">
          <button
            type="button"
            onClick={() => setShowLoginNudge(false)}
            className="absolute right-2 top-2 rounded p-0.5 text-[var(--muted)] hover:bg-[var(--card-elev)]"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="text-xs leading-relaxed">
            <Bell className="mr-1 inline h-3.5 w-3.5 text-[var(--brand)]" />
            <span className="font-semibold">No account needed</span> to reserve.{" "}
            <Link href="/login?next=/order" className="font-semibold text-[var(--brand)] underline">
              Sign in
            </Link>{" "}
            only if you want dose reminders and order history — takes a few seconds.
          </p>
        </div>
      )}

      {state?.error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-700/60 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-300/60 dark:text-rose-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <label className="label-premium">Product *</label>
          {(medications.length > 8 || pharmacyId) && (
            <div className="relative mb-1 flex items-center">
              <Search className="pointer-events-none absolute left-2 h-3 w-3 text-[var(--muted)]" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products…"
                className="rounded-lg border border-[var(--public-flow-ui-border)] bg-[var(--card-elev)]/50 py-0.5 pl-6 pr-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
              />
            </div>
          )}
        </div>
        <select
          name="medicationId"
          required
          value={medicationId}
          onChange={(e) => handleMedicationChange(e.target.value)}
          className="input-premium"
        >
          {catalog.map((m) => (
            <option key={m.id} value={m.id} disabled={m.stockQty <= 0}>
              {m.name} — KES {m.price.toLocaleString()} ({m.stockQty > 0 ? `${m.stockQty} available` : "Out of stock"})
            </option>
          ))}
        </select>
        {selected && selected.stockQty <= 0 && (
          <p className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-200">
            All units for this product are currently reserved or out of stock. Please select another product or check back soon.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-premium">Quantity *</label>
          <div className="relative">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              name="quantity"
              type="number"
              min={1}
              max={Math.max(1, Math.min(20, selected?.stockQty || 1))}
              value={quantity}
              onChange={(e) => {
                const maxAvailable = Math.max(1, Math.min(20, selected?.stockQty || 1));
                const val = Number(e.target.value) || 1;
                setQuantity(Math.max(1, Math.min(maxAvailable, val)));
              }}
              className="input-premium !pl-10"
              required
              disabled={!selected || selected.stockQty <= 0}
            />
          </div>
          {selected && selected.stockQty > 0 && selected.stockQty < 20 && (
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              Maximum available: {selected.stockQty}
            </p>
          )}
        </div>
        <div className="flex flex-col justify-end">
          <p className="rounded-xl border border-[var(--public-flow-ui-border)] bg-[var(--card-elev)] px-4 py-3 text-sm font-bold text-[var(--foreground)]">
            Est. total: KES {total.toLocaleString()}
          </p>
        </div>
      </div>

      <div>
        <label className="label-premium">Full name *</label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input name="fullName" required className="input-premium !pl-10" placeholder="Jane Wanjiku" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-premium">Phone (M-Pesa) *</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              name="phone"
              type="tel"
              required
              className="input-premium !pl-10"
              placeholder="07xx xxx xxx"
            />
          </div>
        </div>
        <div>
          <label className="label-premium">Email (optional)</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input name="email" type="email" className="input-premium !pl-10" placeholder="you@email.com" />
          </div>
        </div>
      </div>

      <div>
        <label className="label-premium">Pickup or delivery</label>
        {supportsDelivery ? (
          <>
            <select name="pickupPreference" className="input-premium" defaultValue="pickup">
              <option value="pickup">Collect in store</option>
              <option value="delivery">Home delivery (we&apos;ll confirm fee)</option>
            </select>
            {deliveryRadiusKm ? (
              <p className="mt-1 text-xs text-[var(--muted)]">
                Local delivery available within {deliveryRadiusKm} km.
              </p>
            ) : deliveryNotes ? (
              <p className="mt-1 text-xs text-[var(--muted)]">{deliveryNotes}</p>
            ) : null}
          </>
        ) : (
          <div>
            <input type="hidden" name="pickupPreference" value="pickup" />
            <div className="rounded-xl border border-[var(--public-flow-ui-border)] bg-[var(--card-elev)]/50 px-3 py-2.5 text-xs text-[var(--muted)]">
              Collect in store (this pharmacy does not offer home delivery).
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="label-premium">Reason for this medication *</label>
        <select name="reason" required className="input-premium" defaultValue="">
          <option value="" disabled>
            Select a reason…
          </option>
          <option value="for known condition">For a known condition</option>
          <option value="recommended by pharmacist">Recommended by pharmacist</option>
          <option value="returning customer">Returning customer / refill of OTC</option>
          <option value="self care">Self-care / minor symptom</option>
          <option value="other">Other (describe in notes)</option>
        </select>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Staff review this before dispatch so we know why the medicine is needed.
        </p>
      </div>

      <div>
        <label className="label-premium">Delivery / pickup notes (optional)</label>
        <textarea
          name="notes"
          rows={2}
          className="input-premium"
          placeholder="Landmark, preferred time, etc."
        />
      </div>

      {onlinePaymentsEnabled && <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--public-flow-ui-border)] bg-[var(--card-elev)]/40 px-3 py-2.5 text-sm">
        <input
          type="checkbox"
          name="payNow"
          value="on"
          checked={payNow}
          onChange={(e) => setPayNow(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[var(--public-flow-ui-border)] text-[var(--brand)] focus:ring-[var(--brand)]"
        />
        <span>
          <span className="font-semibold text-[var(--foreground)]">Pay with M-Pesa after reserve</span>
          <span className="mt-0.5 block text-xs text-[var(--muted)]">
            We hold stock first, then open STK on your phone. Uncheck to pay at collection only.
          </span>
        </span>
      </label>}

      <p className="text-xs text-[var(--muted)]">
        No account required. Remote orders are <strong>reservations</strong> — staff dispatch when
        you collect or when the rider leaves. Counter sales can be auto-dispatched by the pharmacist.
      </p>

      <button
        type="submit"
        disabled={pending || !selected || selected.stockQty <= 0}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-100 disabled:saturate-50"
      >
        {pending ? (
          "Reserving…"
        ) : (
          <>
            <ShoppingBag className="h-4 w-4" />
            {onlinePaymentsEnabled && payNow ? "Reserve & pay" : "Reserve only"}
            <Send className="h-4 w-4 opacity-70" />
          </>
        )}
      </button>
    </form>
  );
}
