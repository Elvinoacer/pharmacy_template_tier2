"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { FormSuccess, SelectInput, TextArea, TextInput } from "./FormField";
import { jobs } from "../lib/data";

export default function CareerForm({ defaultRole }: { defaultRole?: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [fileName, setFileName] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = e.currentTarget;
    const formData = new FormData(form);

    // Demo: CV is not uploaded to storage — we only record metadata
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      role: formData.get("role"),
      message: formData.get("message"),
      cvFileName: fileName || "not-provided",
      company: formData.get("company"),
    };

    try {
      const res = await fetch("/api/careers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("success");
      form.reset();
      setFileName("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <FormSuccess
        title="Application received"
        message="Thank you for your interest in joining Aether Pharmacy. Our team reviews applications regularly and will contact shortlisted candidates."
        actions={
          <Link href="/careers" className="btn-primary !py-2.5 text-sm">
            Back to careers
          </Link>
        }
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Full name" id="name" required autoComplete="name" />
        <TextInput label="Email" id="email" type="email" required autoComplete="email" />
      </div>
      <TextInput label="Phone" id="phone" type="tel" required autoComplete="tel" />
      <SelectInput label="Role" id="role" required defaultValue={defaultRole || ""}>
        <option value="" disabled>
          Select a position
        </option>
        {jobs.map((j) => (
          <option key={j.id} value={j.title}>
            {j.title}
          </option>
        ))}
        <option value="General application">General application</option>
      </SelectInput>
      <div>
        <label htmlFor="cv" className="mb-1.5 block text-sm font-medium text-[#0c1a14]">
          CV / resume <span className="text-red-600">*</span>
        </label>
        <input
          id="cv"
          name="cv"
          type="file"
          required
          accept=".pdf,.doc,.docx"
          className="block w-full text-sm text-[#5a6b62] file:mr-4 file:rounded-full file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-teal-800 hover:file:bg-teal-100"
          onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
        />
        {fileName && <p className="mt-1 text-xs text-[#5a6b62]">Selected: {fileName}</p>}
        <p className="mt-1 text-xs text-[#5a6b62]">PDF or Word · max 5 MB (demo — file is not stored)</p>
      </div>
      <TextArea label="Cover note (optional)" id="message" rows={4} placeholder="Tell us why you would like to join." />
      <div className="absolute left-[-9999px]" aria-hidden>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {status === "error" && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          Something went wrong. Please try again or email us your CV directly.
        </p>
      )}
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={status === "submitting"}>
        {status === "submitting" ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
