"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { FormSuccess, TextArea, TextInput } from "./FormField";

export default function RefillForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/refill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <FormSuccess
        title="Refill request submitted"
        message="We have received your refill request. Our team will confirm availability and contact you when it is ready for pickup or delivery. This is a request only — not a clinical workflow confirmation."
        actions={
          <>
            <Link href="/" className="btn-primary !py-2.5 text-sm">
              Back to home
            </Link>
            <Link href="/delivery" className="btn-ghost !py-2.5 text-sm">
              Ask about delivery
            </Link>
          </>
        }
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Full name" id="fullName" required autoComplete="name" />
        <TextInput label="Phone number" id="phone" type="tel" required autoComplete="tel" />
      </div>
      <TextInput
        label="Email (optional)"
        id="email"
        type="email"
        autoComplete="email"
        placeholder="Optional"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          label="Prescription number (optional)"
          id="rxNumber"
          placeholder="e.g. RX-10482"
        />
        <TextInput label="Medicine name" id="medicine" required placeholder="e.g. Lisinopril 10mg" />
      </div>
      <TextInput label="Preferred pickup date" id="pickupDate" type="date" required />
      <TextArea label="Notes (optional)" id="notes" rows={3} placeholder="Allergies, delivery preference, etc." />
      <div className="absolute left-[-9999px]" aria-hidden>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {status === "error" && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          Something went wrong. Please try again or call the pharmacy.
        </p>
      )}
      <p className="text-xs text-[#5a6b62]">
        By submitting, you confirm the information is accurate. Controlled substances may require additional verification.
      </p>
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={status === "submitting"}>
        {status === "submitting" ? "Submitting…" : "Submit refill request"}
      </button>
    </form>
  );
}
