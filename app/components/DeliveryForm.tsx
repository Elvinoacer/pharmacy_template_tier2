"use client";

import { useState, type FormEvent } from "react";
import TenantLink, { useTenantSlug } from "./TenantLink";
import { FormSuccess, TextArea, TextInput } from "./FormField";

export default function DeliveryForm({ pharmacySlug: pharmacySlugProp }: { pharmacySlug?: string } = {}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const tenantSlug = useTenantSlug();
  const pharmacySlug = pharmacySlugProp || tenantSlug || undefined;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, ...(pharmacySlug ? { pharmacySlug } : {}) }),
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
        title="Delivery enquiry sent"
        message="Thanks — we will confirm whether your area is within our delivery zones and follow up shortly with options and timing."
        actions={
          <>
            <TenantLink href="/refill" className="btn-primary w-full justify-center !py-2.5 text-sm sm:w-auto">
              Request a refill
            </TenantLink>
            <TenantLink href="/contact" className="btn-ghost w-full justify-center !py-2.5 text-sm sm:w-auto">
              Contact us
            </TenantLink>
          </>
        }
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="min-w-0 space-y-4" noValidate={false}>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <TextInput label="Name" id="name" required autoComplete="name" placeholder="Your full name" />
        <TextInput
          label="Phone"
          id="phone"
          type="tel"
          inputMode="tel"
          required
          autoComplete="tel"
          placeholder="+254 700 000 000"
        />
      </div>
      <TextInput
        label="Delivery area / neighbourhood"
        id="area"
        required
        autoComplete="street-address"
        placeholder="e.g. Westlands, Kasarani, Kilimani"
      />
      <TextArea
        label="Message"
        id="message"
        required
        rows={4}
        placeholder="Tell us what you need and when you would prefer delivery."
      />
      <div className="absolute left-[-9999px]" aria-hidden>
        <input id="fax" name="fax" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {status === "error" && (
        <p
          className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-3 text-sm leading-5 text-rose-600 dark:text-rose-300"
          role="alert"
        >
          Something went wrong. Please try again or call the pharmacy directly.
        </p>
      )}
      <button
        type="submit"
        className="btn-primary min-h-12 w-full justify-center sm:w-auto"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Sending…" : "Send delivery enquiry"}
      </button>
      <p className="text-xs leading-5 text-[var(--muted-2)]">
        Sending an enquiry does not place an order. The pharmacy will first confirm availability, delivery coverage, cost, and timing.
      </p>
    </form>
  );
}
