"use client";
import { useActionState } from "react";
import { pharmacyBillingAction, promotionAction } from "@/app/actions/pharmacy-billing";
const input = "mt-1 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)]";
export function PharmacyPaymentForm({ pharmacyId, invoiceId }: { pharmacyId: string; invoiceId?: string }) {
  const [state, action, pending] = useActionState(pharmacyBillingAction, {});
  return <form action={action} className="space-y-3"><input type="hidden" name="pharmacyId" value={pharmacyId}/><input type="hidden" name="intent" value={invoiceId ? "pay" : "activate"}/>{invoiceId && <><input type="hidden" name="invoiceId" value={invoiceId}/><label className="block text-sm">M-Pesa phone number<input className={input} name="phone" type="tel" autoComplete="tel" placeholder="0712 345 678" required/></label></>}<button disabled={pending} className="btn-primary min-h-11" type="submit">{pending ? "Processing…" : invoiceId ? "Request M-Pesa payment" : "Activate KES 500/month service"}</button><p role="status" className="text-sm">{state.error || state.success}</p></form>;
}
export function PromotionForm({ promotionId }: { promotionId?: string }) {
  const [state, action, pending] = useActionState(promotionAction, {});
  return <form action={action} className="space-y-3"><input type="hidden" name="intent" value={promotionId ? "stop" : "create"}/>{promotionId ? <input type="hidden" name="promotionId" value={promotionId}/> : <div className="grid gap-3 sm:grid-cols-2"><label>Promotion name / reason<input className={input} name="name" required minLength={5} maxLength={150}/></label><label>Number of joining pharmacies<input className={input} name="capacity" type="number" min={1} max={100000} required/></label><label>Waive<select className={input} name="scope"><option value="both">Both fees</option><option value="verification">Verification fee only</option><option value="recurring">Monthly service only</option></select></label><label>Free service months<input className={input} name="months" type="number" min={1} max={120} defaultValue={1} required/></label></div>}<button className="btn-primary min-h-11" disabled={pending}>{pending ? "Saving…" : promotionId ? "Stop new allocations" : "Create capped promotion"}</button><p role="status">{state.error || state.success}</p></form>;
}

export function CancelServiceForm({ pharmacyId }: { pharmacyId: string }) {
  const [state, action, pending] = useActionState(pharmacyBillingAction, {});
  return <form action={action} className="mt-4 space-y-3"><input type="hidden" name="pharmacyId" value={pharmacyId}/><input type="hidden" name="intent" value="cancel"/><button className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold" disabled={pending}>{pending ? "Saving…" : "Cancel renewal at period end"}</button><p role="status" className="text-sm">{state.error || state.success}</p></form>;
}
