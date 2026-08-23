"use client";

import { useState, type FormEvent } from "react";
import TenantLink from "./TenantLink";
import Link from "next/link";
import { FormSuccess, TextArea, TextInput } from "./FormField";

export default function DeliveryForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/delivery", {
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
        title="Delivery enquiry sent"
        message="Thanks — we will confirm whether your area is within our delivery zones and follow up shortly with options and timing."
        actions={
          <>
            <TenantLink href="/refill" className="btn-primary btn-primary-sm">
              Request a refill
            </TenantLink>      <TenantLink href="/contact" className="btn-ghost btn-ghost-sm">
              Contact us
            </TenantLink>    </>
        }
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Name" id="name" required autoComplete="name" />
        <TextInput label="Phone" id="phone" type="tel" required autoComplete="tel" />
      </div>
      <TextInput
        label="Delivery area / neighbourhood"
        id="area"
        required
        placeholder="e.g. South Congress, 78704"
      />
      <TextArea
        label="Message"
        id="message"
        required
        rows={4}
        placeholder="Tell us about timing, medications, or special handling needs."
      />
      <div className="absolute left-[-9999px]" aria-hidden>
        <input id="fax" name="fax" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {status === "error" && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          Something went wrong. Please try again or call us.
        </p>
      )}
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Send delivery enquiry"}
      </button>
    </form>
  );
}
