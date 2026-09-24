"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { pharmacyBillingAction } from "@/app/actions/pharmacy-billing";
import { useAdminPlanStatus } from "./AdminPlanStatus";

export function PremiumGate({ feature, description, label, usageKey, global = false }: { global?: boolean; feature: string; description?: string; label?: string; usageKey?: "medicines" | "services" | "campaigns" | "prescriptionReferrals" }) {
  const { status, refresh } = useAdminPlanStatus();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [context, setContext] = useState<string | null>(null);
  useEffect(() => {
    if (!global) return;
    const open = (event: Event) => { setContext((event as CustomEvent<string>).detail); dialog.current?.showModal(); };
    window.addEventListener("afyvia:premium-required", open);
    return () => window.removeEventListener("afyvia:premium-required", open);
  }, [global]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const state = status?.planState;
  const reactivation = Boolean(status?.subscription.status);
  const pendingSetup = state?.billingStatus === "premium_pending_activation";
  async function checkout() {
    if (!status || busy) return;
    setBusy(true); setError("");
    try {
      const form = new FormData();
      form.set("pharmacyId", status.pharmacy.id); form.set("intent", "premium_checkout");
      const result = await pharmacyBillingAction({}, form);
      if (result.error) setError(result.error);
      else if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
      else { refresh(); router.refresh(); dialog.current?.close(); }
    } catch { setError("Could not prepare checkout. Please retry."); }
    finally { setBusy(false); }
  }
  return <>
    <button style={global ? { display: "none" } : undefined} type="button" onClick={() => dialog.current?.showModal()} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--admin-accent)] px-4 py-2 text-sm font-semibold text-white">{label ?? (reactivation ? "Reactivate Premium — KES 500" : "Upgrade to Premium — KES 500")}</button>
    <dialog ref={dialog} className="m-auto w-[min(32rem,calc(100%-2rem))] max-h-[85svh] overflow-y-auto rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-6 text-[var(--admin-text)] shadow-xl backdrop:bg-black/50" aria-labelledby={titleId}>
      <h2 id={titleId} className="text-xl font-bold">{feature}</h2>
      {!status ? <p className="my-4">Plan status is unavailable. Close and retry shortly.</p> : <>
        <p className="mt-3 text-sm">Current plan: {status.premium ? "Afyvia Premium" : "Afyvia Free"}</p>
        <p className="mt-3">{pendingSetup ? "Premium paid — finish pharmacy setup to activate Premium features." : state?.blockedReason ?? (status.subscription.paymentAttention ? "Premium payment needs attention. Your Free workspace remains available." : reactivation && !status.premium ? `Premium has ended${status.subscription.periodEnd ? ` (${new Date(status.subscription.periodEnd).toLocaleDateString("en-KE")})` : ""}. Your pharmacy is now operating on Afyvia Free.` : "This action requires Premium capacity.")}</p>
        {usageKey && <p className="mt-3 font-semibold">{status.usage[usageKey].used}/{status.usage[usageKey].limit ?? "unlimited"} used{usageKey === "campaigns" || usageKey === "prescriptionReferrals" ? " this month" : ""}.</p>}
        {(context || description) && <p className="mt-3 text-sm">{context || description}</p>}
        <p className="mt-3 text-sm">Free keeps your existing prescriptions, dispensing, patients, orders, stock and bookings available. Your work is preserved.</p>
        <p className="my-4 font-semibold">Afyvia Premium · KES 500/month</p>
        {!status.isOwner ? <p>Only the pharmacy owner can manage billing.</p> : state && !state.pharmacyReady ? <Link href="/admin/setup" className="underline">Finish pharmacy setup</Link> : <button type="button" disabled={busy} onClick={checkout} className="min-h-11 rounded-xl bg-[var(--admin-accent)] px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Preparing secure checkout…" : error ? "Retry checkout" : reactivation ? "Pay KES 500 & restore Premium" : "Upgrade to Premium"}</button>}
      </>}
      {error && <p role="alert" className="mt-3 text-red-600">{error}</p>}
      <form method="dialog" className="mt-4"><button className="min-h-11 rounded-xl border px-4 py-2">Not now</button></form>
    </dialog>
  </>;
}

export function PremiumPaymentReturn() {
  const { status, refresh } = useAdminPlanStatus();
  const router = useRouter();
  const [returned, setReturned] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("payment") !== "returned") return;
    setReturned(true);
    let stopped = false;
    let attempts = 0;
    const reconcile = async () => {
      try { await fetch("/api/payments/billing/status", { method: "POST" }); } catch { /* Webhook/cron still reconcile independently. */ }
      if (!stopped) { refresh(); router.refresh(); }
      attempts++;
    };
    void reconcile();
    const timer = setInterval(() => { if (attempts < 12) void reconcile(); }, 5000);
    return () => { stopped = true; clearInterval(timer); };
  // refresh is provided by the plan context and changes when status refreshes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);
  return returned ? <p role="status" className="rounded-xl border border-emerald-500/30 p-4">{status?.premium ? "Premium restored" : "Checking payment confirmation. You can safely leave this page; confirmed payments are also processed automatically."}</p> : null;
}
