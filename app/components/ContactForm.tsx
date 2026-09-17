"use client";

import { useState, type FormEvent } from "react";
import TenantLink from "./TenantLink";
import { FormSuccess, SelectInput, TextArea, TextInput } from "./FormField";

export default function ContactForm({
  pharmacySlug,
  pharmacies = [],
}: {
  pharmacySlug?: string;
  pharmacies?: { slug: string; name: string; address?: string }[];
} = {}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string>(pharmacySlug || (pharmacies[0]?.slug ?? ""));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const targetSlug = pharmacySlug || selectedSlug || (data.pharmacySlug as string);

    if (!targetSlug) {
      setStatus("error");
      setErrorMessage("Please select a pharmacy branch to contact.");
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, pharmacySlug: targetSlug }),
      });
      if (!res.ok) {
        const errPayload = await res.json().catch(() => null);
        throw new Error(errPayload?.error || "Failed");
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error && err.message !== "Failed" ? err.message : null);
    }
  }

  if (status === "success") {
    return (
      <FormSuccess
        title="Message received"
        message="Thank you for contacting the pharmacy. A team member will respond within one business day. For urgent medication needs, please call us directly."
        actions={
          <>
            <TenantLink href="/" className="btn-primary w-full justify-center !py-2.5 text-sm sm:w-auto">
              Back to home
            </TenantLink>
            <TenantLink href="/faq" className="btn-ghost w-full justify-center !py-2.5 text-sm sm:w-auto">
              Browse FAQ
            </TenantLink>
          </>
        }
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="min-w-0 space-y-4" noValidate={false}>
      {!pharmacySlug && pharmacies.length > 0 && (
        <SelectInput
          label="Pharmacy branch *"
          id="pharmacySlug"
          name="pharmacySlug"
          required
          value={selectedSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
        >
          <option value="" disabled>
            Select a pharmacy branch to contact *
          </option>
          {pharmacies.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name} {p.address ? `(${p.address})` : ""}
            </option>
          ))}
        </SelectInput>
      )}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <TextInput label="Full name" id="name" required autoComplete="name" placeholder="Jane Doe" />
        <TextInput
          label="Phone"
          id="phone"
          type="tel"
          required
          autoComplete="tel"
          placeholder="+254 700 000 000"
        />
      </div>
      <TextInput
        label="Email"
        id="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
      />
      <SelectInput label="Subject" id="subject" required defaultValue="">
        <option value="" disabled>
          Select a topic
        </option>
        <option value="general">General enquiry</option>
        <option value="prescription">Prescription question</option>
        <option value="insurance">Insurance</option>
        <option value="services">Services</option>
        <option value="other">Other</option>
      </SelectInput>
      <TextArea
        label="Message"
        id="message"
        required
        rows={5}
        placeholder="How can we help?"
      />
      {/* Honeypot spam protection */}
      <div className="absolute left-[-9999px]" aria-hidden>
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {status === "error" && (
        <p className="rounded-xl border border-[var(--line-2)] bg-[var(--card-elev)] px-3.5 py-3 text-sm leading-5 text-rose-600" role="alert">
          {errorMessage || "Something went wrong. Please try again or call us directly."}
        </p>
      )}
      <button
        type="submit"
        className="btn-primary min-h-12 w-full justify-center sm:w-auto"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
