"use client";

import { useState, type FormEvent } from "react";
import TenantLink, { useTenantSlug } from "./TenantLink";
import { FormSuccess, SelectInput, TextArea, TextInput } from "./FormField";

type CareerRole = { id: string; title: string };

export default function CareerForm({
  defaultRole,
  roles,
  pharmacySlug: pharmacySlugProp,
}: {
  defaultRole?: string;
  roles?: CareerRole[];
  pharmacySlug?: string;
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const tenantSlug = useTenantSlug();
  const pharmacySlug = pharmacySlugProp || tenantSlug || undefined;
  const roleOptions = roles ?? [];

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    if (pharmacySlug) {
      formData.set("pharmacySlug", pharmacySlug);
    }

    try {
      const res = await fetch("/api/careers", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit application");
      }
      setStatus("success");
      form.reset();
      setFileName("");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again or email your CV directly.",
      );
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <FormSuccess
        title="Application received"
        message="Thank you for your interest in joining the pharmacy team. Applications are reviewed regularly and shortlisted candidates will be contacted."
        actions={
          <TenantLink href="/careers" className="btn-primary w-full justify-center !py-2.5 text-sm sm:w-auto">
            Back to careers
          </TenantLink>
        }
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="min-w-0 space-y-4" noValidate={false}>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <TextInput label="Full name" id="name" required autoComplete="name" />
        <TextInput label="Email" id="email" type="email" required autoComplete="email" />
      </div>
      <TextInput label="Phone" id="phone" type="tel" inputMode="tel" required autoComplete="tel" />
      <SelectInput label="Role" id="role" required defaultValue={defaultRole || ""}>
        <option value="" disabled>
          Select a position
        </option>
        {roleOptions.map((role) => (
          <option key={role.id} value={role.title}>
            {role.title}
          </option>
        ))}
        <option value="General application">General application</option>
      </SelectInput>

      <div className="min-w-0">
        <label htmlFor="cv" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
          CV / resume <span className="text-rose-600">*</span>
        </label>
        <label
          htmlFor="cv"
          className="flex min-h-14 min-w-0 cursor-pointer flex-col justify-center rounded-xl border border-dashed border-[var(--line-2)] bg-[var(--card-elev)] px-3.5 py-3 transition hover:border-[var(--brand)] hover:bg-[var(--brand-tint)] focus-within:ring-2 focus-within:ring-[var(--brand)] sm:px-4"
        >
          <span className="text-sm font-semibold text-[var(--foreground)]">
            {fileName || "Choose CV or resume"}
          </span>
          <span className="mt-1 text-xs leading-5 text-[var(--muted)]">PDF or Word · max 5 MB</span>
          <input
            id="cv"
            name="cv"
            type="file"
            required
            accept=".pdf,.doc,.docx"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
          />
        </label>
        {fileName && <p className="mt-1.5 break-all text-xs text-[var(--muted)]">Selected: {fileName}</p>}
      </div>

      <TextArea label="Cover note (optional)" id="message" rows={4} placeholder="Tell us why you would like to join." />

      <div className="absolute left-[-9999px]" aria-hidden>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {status === "error" && (
        <p className="rounded-xl border border-[var(--line-2)] bg-[var(--card-elev)] px-3.5 py-3 text-sm leading-5 text-rose-600" role="alert">
          {errorMessage || "Something went wrong. Please try again or email your CV directly."}
        </p>
      )}

      <button
        type="submit"
        className="btn-primary min-h-12 w-full justify-center sm:w-auto"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
