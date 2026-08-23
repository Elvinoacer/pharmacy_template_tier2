"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  createPharmacyDraftAction,
  submitPharmacyApplicationAction,
  updatePharmacyDraftAction,
  type OnboardState,
} from "@/app/actions/onboard";
import { slugifyPharmacyName } from "@/app/lib/slug";

type Existing = {
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  tagline: string | null;
  description: string | null;
  licenseNumber: string | null;
  ppbPremisesNumber: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  county: string | null;
  status: string;
} | null;

const STEPS = ["Account & identity", "Location & contact", "Review"];

export default function OnboardWizard({
  signedIn,
  existing,
}: {
  signedIn: boolean;
  existing: Existing;
}) {
  const [step, setStep] = useState(existing ? 1 : 0);
  const [name, setName] = useState(existing?.name || "");
  const [slug, setSlug] = useState(existing?.slug || "");
  const [pharmacyId, setPharmacyId] = useState(existing?.id || "");
  const [status, setStatus] = useState(existing?.status || "draft");

  const [createState, createAction, createPending] = useActionState(
    createPharmacyDraftAction,
    {} as OnboardState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updatePharmacyDraftAction,
    {} as OnboardState,
  );
  const [submitState, submitAction, submitPending] = useActionState(
    submitPharmacyApplicationAction,
    {} as OnboardState,
  );

  const state = createState.error
    ? createState
    : updateState.error
      ? updateState
      : submitState.error
        ? submitState
        : submitState.success
          ? submitState
          : updateState.success
            ? updateState
            : createState;

  const liveSlug = useMemo(() => slug || slugifyPharmacyName(name), [slug, name]);

  useEffect(() => {
    if (createState.pharmacyId) {
      setPharmacyId(createState.pharmacyId);
      if (createState.slug) setSlug(createState.slug);
      setStatus("draft");
      setStep(1);
    }
  }, [createState.pharmacyId, createState.slug]);

  useEffect(() => {
    if (submitState.success) setStatus("submitted");
  }, [submitState.success]);

  if (status === "submitted" || status === "under_review") {
    return (
      <div className="rounded-3xl border border-teal-900/10 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0d6e5a]">In review</p>
        <h2 className="mt-3 text-2xl font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
          {name || "Your pharmacy"} is with the network team
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#5a6b62]">
          Super-admins verify the licence and location. You will land in the pharmacy admin
          to finish setup (hours, branding, staff) once it is approved.
        </p>
        <p className="mt-6 text-xs text-[#7a8b84]">Application ID {pharmacyId.slice(0, 8)}</p>
      </div>
    );
  }

  if (status === "approved" || status === "active") {
    return (
      <div className="rounded-3xl border border-teal-900/10 bg-white p-8 text-center">
        <h2 className="text-2xl font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
          You are approved
        </h2>
        <p className="mt-2 text-sm text-[#5a6b62]">Finish branding and hours, then go live.</p>
        <Link href="/admin/setup" className="btn-primary mt-6 inline-flex">
          Open setup wizard
        </Link>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
        <h2 className="text-xl font-semibold text-rose-950">Application was not approved</h2>
        <p className="mt-2 text-sm text-rose-800">Check the email on the account, or start a new draft.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-teal-900/10 bg-white p-6 shadow-[0_16px_50px_rgba(8,40,32,0.07)] sm:p-8">
      <ol className="mb-8 flex gap-2">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`flex-1 rounded-full px-2 py-1.5 text-center text-[11px] font-semibold ${
              i === step ? "bg-[#0d6e5a] text-white" : i < step ? "bg-teal-50 text-[#0d6e5a]" : "bg-slate-100 text-slate-500"
            }`}
          >
            {label}
          </li>
        ))}
      </ol>

      {state.error && (
        <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">{state.error}</p>
      )}
      {state.success && (
        <p className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
          {state.success}
        </p>
      )}

      {step === 0 && (
        <form action={createAction} className="space-y-4">
          {!signedIn && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-[#0c1a14]">
                Your name
                <input name="fullName" required className="input-admin mt-1" />
              </label>
              <label className="block text-sm font-medium text-[#0c1a14]">
                Work email
                <input name="email" type="email" required className="input-admin mt-1" />
              </label>
              <label className="block text-sm font-medium text-[#0c1a14] sm:col-span-2">
                Password
                <input name="password" type="password" required className="input-admin mt-1" />
              </label>
            </div>
          )}
          <label className="block text-sm font-medium text-[#0c1a14]">
            Trading name
            <input
              name="name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!existing) setSlug(slugifyPharmacyName(e.target.value));
              }}
              className="input-admin mt-1"
              placeholder="e.g. Coast Care Pharmacy"
            />
          </label>
          <label className="block text-sm font-medium text-[#0c1a14]">
            Public URL
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-[#7a8b84]">/p/</span>
              <input
                name="slug"
                value={slug || liveSlug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                className="input-admin"
              />
            </div>
          </label>
          <label className="block text-sm font-medium text-[#0c1a14]">
            Legal name
            <input name="legalName" defaultValue={existing?.legalName || ""} className="input-admin mt-1" />
          </label>
          <label className="block text-sm font-medium text-[#0c1a14]">
            PPB / premises licence number
            <input
              name="ppbPremisesNumber"
              defaultValue={existing?.ppbPremisesNumber || existing?.licenseNumber || ""}
              required
              autoComplete="off"
              className="input-admin mt-1"
              placeholder="Enter the number on your PPB premises licence"
            />
            <span className="mt-1 block text-xs font-normal text-[#7a8b84]">
              This is required for verification and is kept private while your application is under review.
            </span>
          </label>
          <button className="btn-primary" type="submit" disabled={createPending}>
            {createPending ? "Saving…" : "Save and continue"}
          </button>
        </form>
      )}

      {step === 1 && pharmacyId && (
        <form
          action={(fd) => {
            fd.set("pharmacyId", pharmacyId);
            updateAction(fd);
            setStep(2);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="pharmacyId" value={pharmacyId} />
          <input type="hidden" name="name" value={name} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[#0c1a14]">
              City
              <input name="city" defaultValue={existing?.city || ""} required className="input-admin mt-1" />
            </label>
            <label className="block text-sm font-medium text-[#0c1a14]">
              County
              <input name="county" defaultValue={existing?.county || ""} className="input-admin mt-1" />
            </label>
            <label className="block text-sm font-medium text-[#0c1a14]">
              Public phone
              <input name="phone" defaultValue={existing?.phone || ""} required className="input-admin mt-1" />
            </label>
            <label className="block text-sm font-medium text-[#0c1a14]">
              WhatsApp
              <input name="whatsapp" defaultValue={existing?.whatsapp || ""} className="input-admin mt-1" />
            </label>
            <label className="block text-sm font-medium text-[#0c1a14] sm:col-span-2">
              Public email
              <input name="publicEmail" type="email" defaultValue={existing?.email || ""} className="input-admin mt-1" />
            </label>
            <label className="block text-sm font-medium text-[#0c1a14] sm:col-span-2">
              Tagline
              <input name="tagline" defaultValue={existing?.tagline || ""} className="input-admin mt-1" placeholder="Your neighbourhood pharmacy, built on trust" />
            </label>
            <label className="block text-sm font-medium text-[#0c1a14] sm:col-span-2">
              Short description
              <textarea name="description" rows={4} defaultValue={existing?.description || ""} className="input-admin mt-1" />
            </label>
            <label className="block text-sm font-medium text-[#0c1a14] sm:col-span-2">
              PPB / premises licence number
              <input
                name="ppbPremisesNumber"
                defaultValue={existing?.ppbPremisesNumber || existing?.licenseNumber || ""}
                required
                autoComplete="off"
                className="input-admin mt-1"
                placeholder="Enter the number on your PPB premises licence"
              />
              <span className="mt-1 block text-xs font-normal text-[#7a8b84]">
                We will use this number when the network team verifies your application.
              </span>
            </label>
          </div>
          <div className="flex gap-3">
            <button type="button" className="btn-ghost" onClick={() => setStep(0)}>
              Back
            </button>
            <button className="btn-primary" type="submit" disabled={updatePending}>
              {updatePending ? "Saving…" : "Continue to review"}
            </button>
          </div>
        </form>
      )}

      {step === 2 && pharmacyId && (
        <form action={submitAction} className="space-y-4">
          <input type="hidden" name="pharmacyId" value={pharmacyId} />
          <div className="rounded-2xl bg-teal-50/80 p-4 text-sm text-[#084c3f]">
            <p className="font-semibold">{name}</p>
            <p className="mt-1">
              Public URL <code className="rounded bg-white px-1">/p/{slug || liveSlug}</code>
            </p>
            <p className="mt-2 text-[#5a6b62]">
              Submitting sends this application to Aether super-admins. Patients cannot see the
              storefront until you are approved and you choose to go live.
            </p>
          </div>
          <div className="flex gap-3">
            <button type="button" className="btn-ghost" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn-primary" type="submit" disabled={submitPending}>
              {submitPending ? "Submitting…" : "Submit for verification"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
