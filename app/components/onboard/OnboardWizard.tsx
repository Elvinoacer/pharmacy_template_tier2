"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createPharmacyDraftAction, submitPharmacyApplicationAction, updatePharmacyDraftAction, type OnboardState } from "@/app/actions/onboard";
import { slugifyPharmacyName } from "@/app/lib/slug";
import PharmacyLocationCapture from "@/app/components/location/PharmacyLocationCapture";
import styles from "./OnboardWizard.module.css";

type Existing = {
  id: string; slug: string; name: string; legalName: string | null; tagline: string | null; description: string | null;
  licenseNumber: string | null; ppbPremisesNumber: string | null; phone: string | null; whatsapp: string | null; email: string | null;
  city: string | null; county: string | null; latitude: number | null; longitude: number | null; status: string;
} | null;

const STEPS = ["Account & identity", "Location & contact", "Review"];

export default function OnboardWizard({ signedIn, existing }: { signedIn: boolean; existing: Existing }) {
  const [step, setStep] = useState(existing ? 1 : 0);
  const [name, setName] = useState(existing?.name || "");
  const [slug, setSlug] = useState(existing?.slug || "");
  const [legalName, setLegalName] = useState(existing?.legalName || "");
  const [licenseNumber, setLicenseNumber] = useState(existing?.licenseNumber || "");
  const [pharmacyId, setPharmacyId] = useState(existing?.id || "");
  const [status, setStatus] = useState(existing?.status || "draft");
  const [city, setCity] = useState(existing?.city || "");
  const [county, setCounty] = useState(existing?.county || "");
  const [phone, setPhone] = useState(existing?.phone || "");
  const [whatsapp, setWhatsapp] = useState(existing?.whatsapp || "");
  const [publicEmail, setPublicEmail] = useState(existing?.email || "");
  const [tagline, setTagline] = useState(existing?.tagline || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [latitude, setLatitude] = useState<number | null>(existing?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(existing?.longitude ?? null);

  const [createState, createAction, createPending] = useActionState(createPharmacyDraftAction, {} as OnboardState);
  const [updateState, updateAction, updatePending] = useActionState(updatePharmacyDraftAction, {} as OnboardState);
  const [submitState, submitAction, submitPending] = useActionState(submitPharmacyApplicationAction, {} as OnboardState);
  const nextStepAfterUpdate = useRef<number | null>(null);

  const state = createState.error ? createState : updateState.error ? updateState : submitState.error ? submitState : {};
  const liveSlug = useMemo(() => slug || slugifyPharmacyName(name), [slug, name]);
  const isIdentityError = ["name", "slug", "licenseNumber"].includes(state.field || "");
  const isContactError = ["city", "phone", "location"].includes(state.field || "");

  useEffect(() => {
    if (createState.pharmacyId) {
      setPharmacyId(createState.pharmacyId);
      if (createState.slug) setSlug(createState.slug);
      setStatus("draft");
      setStep(1);
    }
  }, [createState.pharmacyId, createState.slug]);

  useEffect(() => {
    if (updateState.success && nextStepAfterUpdate.current !== null) {
      const target = nextStepAfterUpdate.current;
      nextStepAfterUpdate.current = null;
      setStep(target);
    } else if (updateState.error) {
      nextStepAfterUpdate.current = null;
    }
  }, [updateState]);

  useEffect(() => { if (submitState.success) setStatus("submitted"); }, [submitState.success]);

  if (status === "submitted" || status === "under_review") return (
    <div className="rounded-3xl border border-teal-900/10 bg-white p-6 text-center shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0d6e5a]">In review</p>
      <h2 className="mt-3 text-2xl font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>{name || "Your pharmacy"} is with the network team</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#5a6b62]">Super-admins verify the licence and precise premises location. You will land in the pharmacy admin to finish setup once it is approved.</p>
      <p className="mt-6 text-xs text-[#7a8b84]">Application ID {pharmacyId.slice(0, 8)}</p>
    </div>
  );

  if (status === "approved" || status === "active") return (
    <div className="rounded-3xl border border-teal-900/10 bg-white p-6 text-center sm:p-8">
      <h2 className="text-2xl font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>You are approved</h2>
      <p className="mt-2 text-sm text-[#5a6b62]">Finish branding and hours, then go live.</p>
      <Link href="/admin/setup" className="btn-primary mt-6 inline-flex w-full justify-center sm:w-auto">Open setup wizard</Link>
    </div>
  );

  if (status === "rejected") return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center sm:p-8">
      <h2 className="text-xl font-semibold text-rose-950">Application was not approved</h2>
      <p className="mt-2 text-sm text-rose-800">Check the email on the account, or start a new draft.</p>
    </div>
  );

  return (
    <div className={`${styles.onboardForm} rounded-2xl border border-teal-900/10 bg-white p-4 shadow-[0_16px_50px_rgba(8,40,32,0.07)] sm:rounded-3xl sm:p-8`}>
      <ol className="mb-6 flex gap-1.5 sm:mb-8 sm:gap-2" aria-label="Application progress">
        {STEPS.map((label, i) => <li key={label} aria-current={i === step ? "step" : undefined} className={`flex min-w-0 flex-1 items-center justify-center rounded-full px-1.5 py-2 text-center text-[10px] font-semibold leading-tight sm:px-2 sm:py-1.5 sm:text-[11px] ${i === step ? "bg-[#0d6e5a] text-white" : i < step ? "bg-teal-50 text-[#0d6e5a]" : "bg-slate-100 text-slate-500"}`}><span className="sm:hidden">{i + 1}. {label.split(" & ")[0]}</span><span className="hidden sm:inline">{label}</span></li>)}
      </ol>

      {state.error && !((step === 0 && isIdentityError) || (step === 1 && isContactError)) && <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm leading-5 text-rose-800" role="alert">{state.error}</p>}

      {step === 0 && <form action={(fd) => { if (pharmacyId) { fd.set("pharmacyId", pharmacyId); nextStepAfterUpdate.current = 1; updateAction(fd); } else createAction(fd); }} className="space-y-5 sm:space-y-4">
        <input type="hidden" name="pharmacyId" value={pharmacyId} />
        {!signedIn && !pharmacyId && <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
          <label className="block text-sm font-medium text-[#0c1a14]">Your name<input name="fullName" autoComplete="name" required className="input-admin mt-1.5" /></label>
          <label className="block text-sm font-medium text-[#0c1a14]">Work email<input name="email" type="email" inputMode="email" autoComplete="email" required className="input-admin mt-1.5" /></label>
          <label className="block text-sm font-medium text-[#0c1a14] sm:col-span-2">Password<input name="password" type="password" autoComplete="new-password" required className="input-admin mt-1.5" /></label>
        </div>}

        <label className="block text-sm font-medium text-[#0c1a14]">Trading name<input name="name" required value={name} onChange={(e) => { setName(e.target.value); if (!pharmacyId) setSlug(slugifyPharmacyName(e.target.value)); }} className="input-admin mt-1.5" placeholder="e.g. Coast Care Pharmacy" autoComplete="organization" aria-invalid={state.field === "name"} />{state.field === "name" && <p className="mt-1.5 text-xs leading-5 text-rose-700" role="alert">{state.error}</p>}</label>
        <label className="block text-sm font-medium text-[#0c1a14]">Public URL<span className="mt-1 block text-xs font-normal leading-5 text-[#7a8b84]">This is your pharmacy's public link.</span><div className="mt-1.5 flex min-w-0 items-center gap-2"><span className="shrink-0 rounded-lg bg-slate-50 px-2.5 py-3 text-sm font-medium text-[#7a8b84]">/p/</span><input name="slug" required value={slug || liveSlug} onChange={(e) => setSlug(e.target.value.toLowerCase())} className="input-admin min-w-0" aria-invalid={state.field === "slug"} autoComplete="off" spellCheck={false} /></div>{state.field === "slug" && <p className="mt-1.5 text-xs leading-5 text-rose-700" role="alert">{state.error}</p>}</label>
        <label className="block text-sm font-medium text-[#0c1a14]">Legal name<input name="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} className="input-admin mt-1.5" autoComplete="organization" /></label>
        <label className="block text-sm font-medium text-[#0c1a14]">PPB / premises licence number<span className="mt-1 block text-xs font-normal leading-5 text-[#7a8b84]">Required for verification. Enter the number exactly as shown on your licence.</span><input name="licenseNumber" required value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="input-admin mt-1.5" aria-invalid={state.field === "licenseNumber"} autoComplete="off" spellCheck={false} />{state.field === "licenseNumber" && <p className="mt-1.5 text-xs leading-5 text-rose-700" role="alert">{state.error}</p>}</label>
        <button className="btn-primary w-full justify-center sm:w-auto" type="submit" disabled={createPending || updatePending}>{createPending || updatePending ? "Saving…" : "Save and continue"}</button>
      </form>}

      {step === 1 && pharmacyId && <form action={(fd) => { fd.set("pharmacyId", pharmacyId); nextStepAfterUpdate.current = 2; updateAction(fd); }} className="space-y-5 sm:space-y-4">
        <input type="hidden" name="pharmacyId" value={pharmacyId} /><input type="hidden" name="name" value={name} /><input type="hidden" name="slug" value={slug || liveSlug} /><input type="hidden" name="legalName" value={legalName} /><input type="hidden" name="licenseNumber" value={licenseNumber} />
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
          <label className="block text-sm font-medium text-[#0c1a14]">City<input name="city" value={city} onChange={(e) => setCity(e.target.value)} required className="input-admin mt-1.5" autoComplete="address-level2" />{state.field === "city" && <p className="mt-1.5 text-xs leading-5 text-rose-700" role="alert">{state.error}</p>}</label>
          <label className="block text-sm font-medium text-[#0c1a14]">County<input name="county" value={county} onChange={(e) => setCounty(e.target.value)} className="input-admin mt-1.5" autoComplete="address-level1" /></label>
        </div>
        <PharmacyLocationCapture pharmacyId={pharmacyId} initialLatitude={latitude} initialLongitude={longitude} onCoordinatesChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} />