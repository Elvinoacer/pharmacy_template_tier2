"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { pharmacyBillingAction } from "@/app/actions/pharmacy-billing";
import { useAdminPlanStatus } from "./AdminPlanStatus";

export function PremiumGate({ feature, description, label, usageKey, global = false, directCheckout = false }: { global?: boolean; directCheckout?: boolean; feature: string; description?: string; label?: string; usageKey?: "medicines" | "services" | "campaigns" | "prescriptionReferrals" }) {
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
  const canManageBilling = status?.canManageBilling ?? status?.isOwner ?? false;
  const reactivation = Boolean(status?.subscription.status);
  const pendingSetup = state?.billingStatus === "premium_pending_activation";
  async function checkout() {
    if (!status || busy) return;
    setBusy(true); setError("");
    try {
      const form = new FormData();
      form.set("pharmacyId", status.pharmacy.id);
      form.set("intent", status.subscription.paymentAttention ? "retry_overdue" : "premium_checkout");
      const result = await pharmacyBillingAction({}, form);
      if (result.error) setError(result.error);
      else if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
      else { refresh(); router.refresh(); dialog.current?.close(); }
    } catch { setError("Could not prepare checkout. Please retry."); }
    finally { setBusy(false); }
  }
  return <>
    <button style={global ? { display: "none" } : undefined} type="button" disabled={busy} onClick={() => (directCheckout || status?.subscription.paymentAttention ? void checkout() : dialog.current?.showModal())} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--admin-accent)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">{busy ? "Preparing secure checkout…" : label ?? (reactivation ? "Reactivate Premium" : "Upgrade to Premium")}</button>
    <dialog ref={dialog} className="m-auto w-[min(32rem,calc(100%-2rem))] max-h-[85svh] overflow-y-auto rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-6 text-[var(--admin-text)] shadow-xl backdrop:bg-black/50" aria-labelledby={titleId}>
      <h2 id={titleId} className="text-xl font-bold">{feature}</h2>
      {!status ? <p className="my-4">Plan status is unavailable. Close and retry shortly.</p> : <>
        <p className="mt-3 text-sm">Current plan: {status.premium ? "Afyvia Premium" : "Afyvia Free"}</p>
        <p className="mt-3">{pendingSetup ? "Premium paid — finish pharmacy setup to activate Premium features." : state?.blockedReason ?? (status.subscription.paymentAttention ? "Premium payment needs attention. Your Free workspace remains available." : reactivation && !status.premium ? `Premium has ended${status.subscription.periodEnd ? ` (${new Date(status.subscription.periodEnd).toLocaleDateString("en-KE")})` : ""}. Your pharmacy is now operating on Afyvia Free.` : "This action requires Premium capacity.")}</p>
        {usageKey && <p className="mt-3 font-semibold">{status.usage[usageKey].used}/{status.usage[usageKey].limit ?? "unlimited"} used{usageKey === "campaigns" || usageKey === "prescriptionReferrals" ? " this month" : ""}.</p>}
        {(context || description) && <p className="mt-3 text-sm">{context || description}</p>}
        <p className="mt-3 text-sm">Free keeps your existing prescriptions, dispensing, patients, orders, stock and bookings available. Your work is preserved.</p>
        <p className="my-4 font-semibold">Afyvia Premium · KES 500/month before any active voucher or subsidy</p>
        {!canManageBilling ? <p>You do not have billing permission for this pharmacy.</p> : state && !state.pharmacyReady ? <Link href="/admin/setup" className="underline">Finish pharmacy setup</Link> : <button type="button" disabled={busy} onClick={checkout} className="min-h-11 rounded-xl bg-[var(--admin-accent)] px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Preparing secure checkout…" : error ? "Retry checkout" : reactivation ? "Reactivate Premium" : "Continue to Premium checkout"}</button>}
      </>}
      {error && <p role="alert" className="mt-3 text-red-600">{error}</p>}
      <form method="dialog" className="mt-4"><button className="min-h-11 rounded-xl border px-4 py-2">Not now</button></form>
    </dialog>
  </>;
}

export function InvoiceCheckoutButton({ pharmacyId, invoiceId, amount }: { pharmacyId: string; invoiceId: string; amount: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function checkout() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("pharmacyId", pharmacyId);
      form.set("invoiceId", invoiceId);
      form.set("intent", "intasend_checkout");
      form.set("returnTo", "admin");
      const result = await pharmacyBillingAction({}, form);
      if (result.error) setError(result.error);
      else if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
      else setError(result.success || "Invoice status changed. Refresh to check it.");
    } catch {
      setError("Could not prepare this invoice's checkout. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return <span className="flex flex-col items-end gap-1">
    <button type="button" disabled={busy} onClick={checkout} className="min-h-11 rounded-xl bg-[var(--admin-accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
      {busy ? "Preparing checkout…" : `Pay KES ${amount.toLocaleString("en-KE")}`}
    </button>
    {error ? <span role="alert" className="max-w-60 text-xs text-rose-700 dark:text-rose-300">{error}</span> : null}
  </span>;
}

export function PremiumPaymentReturn() {
  const { status, refresh } = useAdminPlanStatus();
  const router = useRouter();
  const [returned, setReturned] = useState(false);
  const [result, setResult] = useState<"pending" | "paid" | "failed" | "unresolved">("pending");
  const [detail, setDetail] = useState("");
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("payment") || "";
    if (value !== "returned" && !value.startsWith("return_")) return;
    setReturned(true);
    if (!status?.pharmacy.id) return;
    let stopped = false;
    let attempts = 0;
    let busy = false;
    const invoiceId = value.startsWith("return_") ? value.slice(7) : undefined;
    const reconcile = async () => {
      if (busy || stopped) return;
      busy = true;
      try {
        const response = await fetch("/api/payments/billing/status", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pharmacyId: status.pharmacy.id, invoiceId }),
        });
        const data = (await response.json()) as { state?: string; message?: string };
        if (!response.ok) setDetail("Payment status is temporarily unavailable. Check again shortly.");
        else if (data.state === "paid") setResult("paid");
        else if (data.state === "failed") { setResult("failed"); setDetail("This checkout did not complete. Review the invoice before starting a new checkout."); }
        else if (data.message?.includes("awaiting verified")) setDetail("The provider reports success; receipt verification is still underway. Do not pay again.");
      } catch { setDetail("Payment status is temporarily unavailable. Check again shortly."); }
      if (!stopped) { refresh(); router.refresh(); }
      attempts++;
      if (attempts >= 12 && !stopped) setResult((current) => current === "pending" ? "unresolved" : current);
      busy = false;
    };
    void reconcile();
    const timer = setInterval(() => { if (attempts < 12) void reconcile(); }, 5000);
    return () => { stopped = true; clearInterval(timer); };
  // refresh is provided by the plan context and changes when status refreshes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, status?.pharmacy.id]);
  if (!returned) return null;
  const message = status?.premium ? "Premium restored. Your invoice is paid."
    : result === "paid" ? "Invoice paid. Premium will activate when the remaining pharmacy setup is complete."
    : result === "failed" ? detail
    : result === "unresolved" ? "Payment is still unconfirmed. Do not start another checkout until the provider outcome is known. Use the invoice's status action or contact support."
    : detail || "Checking this invoice's payment status. You can safely leave this page; confirmed payments are also processed automatically.";
  return <p role="status" className="rounded-xl border border-[var(--admin-border)] p-4 text-[var(--admin-text)]">{message}</p>;
}
