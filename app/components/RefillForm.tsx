"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, FileText, Loader2, MapPin, Pill, ShieldCheck, UserRound } from "lucide-react";
import { FormSuccess, TextArea, TextInput } from "./FormField";
import { UploadFeedback } from "@/app/components/prescription/UploadFeedback";

type RefillResult = {
  reference: string;
  trackingToken: string | null;
  duplicate: boolean;
};

export default function RefillForm({ pharmacyName, pharmacySlug, initialMedicine = "", inventoryIds }: { pharmacyName: string; pharmacySlug?: string; initialMedicine?: string; inventoryIds?: string[] }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [result, setResult] = useState<RefillResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/refill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, ...(inventoryIds?.length ? { inventoryIds } : pharmacySlug ? { pharmacySlug } : {}) }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        fields?: Record<string, string[]>;
        reference?: string;
        trackingToken?: string | null;
        duplicate?: boolean;
      };
      if (!res.ok) {
        throw new Error(
          body.error === "validation_failed"
            ? Object.values(body.fields || {}).flat()[0] || "Please check the form details and try again."
            : body.error || "Could not submit the medicine request.",
        );
      }
      setResult({
        reference: body.reference || "Medicine request",
        trackingToken: body.trackingToken ?? null,
        duplicate: Boolean(body.duplicate),
      });
      setStatus("success");
      form.reset();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    const trackingHref = result?.trackingToken
      ? `/refill/status?token=${encodeURIComponent(result.trackingToken)}`
      : null;
    return (
      <FormSuccess
        title={result?.duplicate ? "Request already received" : "Medicine request sent"}
        message={`${result?.duplicate ? "We found the same recent request, so we did not create a duplicate. " : ""}Your request was sent securely to ${pharmacyName}. Reference: ${result?.reference || "—"}. Their team will review it and contact you about availability.`}
        actions={
          <>
            {trackingHref && <Link href={trackingHref} className="btn-primary btn-primary-sm">Track this request</Link>}
            <Link href={pharmacySlug ? `/pharmacies/${pharmacySlug}` : "/medicines"} className="btn-ghost btn-ghost-sm">About the pharmacy</Link>
            <Link href={pharmacySlug ? `/p/${pharmacySlug}/delivery` : "/delivery"} className="btn-ghost btn-ghost-sm">Ask about delivery</Link>
          </>
        }
      />
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-[var(--line-2)] bg-[var(--brand-soft)] p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0d6e5a] text-white">
          <Pill className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-bold text-[var(--foreground)]">Supplied by {pharmacyName}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--card)] px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Connected by availability
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Your request will go directly to this pharmacy.</p>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[#0d6e5a]"><UserRound className="h-4 w-4" aria-hidden="true" /></div>
          <div><h3 className="text-sm font-bold text-[var(--foreground)]">Your details</h3><p className="text-xs text-[var(--muted)]">How the pharmacy can reach you.</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Full name" id="fullName" required autoComplete="name" placeholder="Your full name" />
          <TextInput label="Phone number" id="phone" type="tel" required autoComplete="tel" placeholder="07XX XXX XXX" />
        </div>
        <div className="mt-4">
          <TextInput label="Email" id="email" type="email" autoComplete="email" placeholder="you@example.com (optional)" />
        </div>
      </section>

      <section className="border-t border-[var(--line)] pt-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[#0d6e5a]"><FileText className="h-4 w-4" aria-hidden="true" /></div>
          <div><h3 className="text-sm font-bold text-[var(--foreground)]">Medication</h3><p className="text-xs text-[var(--muted)]">Review the medicines you need.</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextArea label="Medicine name(s)" id="medicine" required maxLength={1500} defaultValue={initialMedicine} readOnly={Boolean(inventoryIds?.length)} rows={3} placeholder="One medicine and strength per line" />
          <TextInput label="Prescription number" id="rxNumber" placeholder="Optional" />
        </div>
      </section>

      <section className="border-t border-[var(--line)] pt-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[#0d6e5a]"><MapPin className="h-4 w-4" aria-hidden="true" /></div>
          <div><h3 className="text-sm font-bold text-[var(--foreground)]">Collection</h3><p className="text-xs text-[var(--muted)]">When would you like to collect it?</p></div>
        </div>
        <TextInput label="Preferred pickup date" id="pickupDate" type="date" required />
        <div className="mt-4">
          <TextArea label="Notes" id="notes" rows={3} placeholder="Anything the pharmacy should know? (optional)" />
        </div>
      </section>

      <div className="absolute left-[-9999px]" aria-hidden="true"><input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>

      {status === "error" && (
        <UploadFeedback
          feedback={{
            code: "request_failed",
            tone: "error",
            title: "We couldn’t send this request",
            message: `${errorMessage || "Something went wrong."} Try again, or contact the pharmacy so this doesn’t stop here.`,
            actions: [
              { id: "retry_submit", label: "Try sending again", variant: "primary" },
              {
                id: "pharmacy",
                label: "About this pharmacy",
                href: pharmacySlug ? `/pharmacies/${pharmacySlug}` : "/pharmacies",
                variant: "ghost",
              },
              { id: "browse", label: "Browse medicines", href: "/medicines", variant: "ghost" },
            ],
          }}
          onAction={(id) => {
            if (id === "retry_submit") formRef.current?.requestSubmit();
          }}
        />
      )}

      <div className="rounded-2xl bg-[var(--card-elev)] p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0d6e5a]" aria-hidden="true" />
          <p className="text-xs leading-5 text-[var(--muted)]">Your details are sent to <span className="font-semibold text-[var(--foreground)]">{pharmacyName}</span> for review. This request is not a prescription or clinical approval.</p>
        </div>
      </div>

      <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0d6e5a] px-5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(13,110,90,0.18)] transition hover:bg-[#0b5f50] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60" disabled={status === "submitting"}>
        {status === "submitting" ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending request…</> : "Send medicine request"}
      </button>
      <p className="text-center text-xs text-[var(--muted)]">You can change your selected pharmacy before submitting.</p>
    </form>
  );
}
