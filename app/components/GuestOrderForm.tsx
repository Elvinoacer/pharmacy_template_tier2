"use client";

import { useActionState, useEffect, useState } from "react";
import TenantLink from "./TenantLink";
import Link from "next/link";
import { guestCreateOrderAction, type GuestOrderState } from "@/app/actions/guest-order";
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
} from "lucide-react";

type Med = { id: string; name: string; price: number; stockQty: number; slug: string };

export function GuestOrderForm({
  medications,
  defaultMedicationId,
  isLoggedIn = false,
}: {
  medications: Med[];
  defaultMedicationId?: string;
  isLoggedIn?: boolean;
}) {
  const [state, formAction, pending] = useActionState(guestCreateOrderAction, {} as GuestOrderState);
  const [medicationId, setMedicationId] = useState(
    defaultMedicationId || medications[0]?.id || "",
  );
  const [quantity, setQuantity] = useState(1);
  const [payNow, setPayNow] = useState(true);
  const [showLoginNudge, setShowLoginNudge] = useState(!isLoggedIn);
  const selected = medications.find((m) => m.id === medicationId);
  const total = selected ? selected.price * quantity : 0;

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  // ── Success: reservation + optional M-Pesa ──────────────────
  if (state?.success && state.orderId) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Check className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-[#0c1a14]">Order reserved</h3>
          <p className="mt-2 text-sm text-[#5a6b62]">{state.success}</p>
          <p className="mt-3 font-mono text-sm font-bold text-emerald-800">
            Ref: {state.orderId.slice(0, 8).toUpperCase()}
          </p>
          {state.total != null && (
            <p className="mt-1 text-sm font-semibold text-[#0c1a14]">
              KES {state.total.toLocaleString()}
            </p>
          )}
        </div>

        {/* Pay now — no account needed; phone already on the order */}
        <div className="rounded-2xl border border-[#e3ebe6] bg-white p-5">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-[#0c1a14]">
            <Smartphone className="h-4 w-4 text-[#0d6e5a]" />
            Pay with M-Pesa
          </h4>
          <p className="mt-1 text-xs text-[#5a6b62]">
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

        {/* Soft account nudge — never blocks purchase */}
        {state.suggestAccount && (
          <div className="rounded-2xl border border-teal-100 bg-[#f0faf6] p-5">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-[#0c1a14]">
              <Bell className="h-4 w-4 text-teal-700" />
              Want dose reminders later?
            </h4>
            <p className="mt-1 text-xs text-[#5a6b62]">
              Creating a free account is optional. It unlocks refill history, loyalty, and
              medication reminders — your reservation already stands without one.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/register" className="btn-primary !py-2 text-sm">
                Create free account
              </Link>
              <TenantLink href="/medicines" className="btn-ghost btn-ghost-sm">
                Browse more
              </TenantLink>      </div>
          </div>
        )}

        {!state.suggestAccount && (
          <div className="flex flex-wrap justify-center gap-3">
            <TenantLink href="/medicines" className="btn-primary btn-primary-sm">
              Browse more
            </TenantLink>      <Link href="/portal/orders" className="btn-ghost !py-2 text-sm">
              View my orders
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (medications.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
        No OTC products are currently listed for online order. Please visit the pharmacy or call us.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Soft login nudge — dismissible, never blocks checkout */}
      {showLoginNudge && !isLoggedIn && (
        <div className="relative rounded-xl border border-teal-100 bg-[#f0faf6] px-3 py-2.5 pr-9 text-sm text-[#0c1a14]">
          <button
            type="button"
            onClick={() => setShowLoginNudge(false)}
            className="absolute right-2 top-2 rounded p-0.5 text-[#5a6b62] hover:bg-white/60"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="text-xs leading-relaxed">
            <Bell className="mr-1 inline h-3.5 w-3.5 text-teal-700" />
            <span className="font-semibold">No account needed</span> to reserve.{" "}
            <Link href="/login?next=/order" className="font-semibold text-teal-800 underline">
              Sign in
            </Link>{" "}
            only if you want dose reminders and order history — takes a few seconds.
          </p>
        </div>
      )}

      {state?.error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div>
        <label className="label-premium">Product *</label>
        <select
          name="medicationId"
          required
          value={medicationId}
          onChange={(e) => setMedicationId(e.target.value)}
          className="input-premium"
        >
          {medications.map((m) => (
            <option key={m.id} value={m.id} disabled={m.stockQty <= 0}>
              {m.name} — KES {m.price.toLocaleString()} ({m.stockQty} left)
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-premium">Quantity *</label>
          <div className="relative">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
            <input
              name="quantity"
              type="number"
              min={1}
              max={Math.min(20, selected?.stockQty || 20)}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="input-premium !pl-10"
              required
            />
          </div>
        </div>
        <div className="flex flex-col justify-end">
          <p className="rounded-xl bg-[#f0faf6] px-4 py-3 text-sm font-semibold text-[#0c1a14]">
            Est. total: KES {total.toLocaleString()}
          </p>
        </div>
      </div>

      <div>
        <label className="label-premium">Full name *</label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
          <input name="fullName" required className="input-premium !pl-10" placeholder="Jane Wanjiku" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-premium">Phone (M-Pesa) *</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
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
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
            <input name="email" type="email" className="input-premium !pl-10" placeholder="you@email.com" />
          </div>
        </div>
      </div>

      <div>
        <label className="label-premium">Pickup or delivery</label>
        <select name="pickupPreference" className="input-premium" defaultValue="pickup">
          <option value="pickup">Collect in store</option>
          <option value="delivery">Home delivery (we&apos;ll confirm fee)</option>
        </select>
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
        <p className="mt-1 text-xs text-[#5a6b62]">
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

      <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[#e3ebe6] bg-[#fafcfb] px-3 py-2.5 text-sm">
        <input
          type="checkbox"
          name="payNow"
          value="on"
          checked={payNow}
          onChange={(e) => setPayNow(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[#c5d4cc]"
        />
        <span>
          <span className="font-semibold text-[#0c1a14]">Pay with M-Pesa after reserve</span>
          <span className="mt-0.5 block text-xs text-[#5a6b62]">
            We hold stock first, then open STK on your phone. Uncheck to pay at collection only.
          </span>
        </span>
      </label>

      <p className="text-xs text-[#5a6b62]">
        No account required. Remote orders are <strong>reservations</strong> — staff dispatch when
        you collect or when the rider leaves. Counter sales can be auto-dispatched by the pharmacist.
      </p>

      <button
        type="submit"
        disabled={pending || !selected || selected.stockQty <= 0}
        className="btn-primary w-full"
      >
        {pending ? (
          "Reserving…"
        ) : (
          <>
            <ShoppingBag className="h-4 w-4" />
            {payNow ? "Reserve & pay" : "Reserve only"}
            <Send className="h-4 w-4 opacity-70" />
          </>
        )}
      </button>
    </form>
  );
}
