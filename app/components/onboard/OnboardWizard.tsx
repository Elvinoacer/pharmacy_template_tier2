"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  checkPharmacySlugAction,
  createPharmacyDraftAction,
  submitPharmacyApplicationAction,
  updatePharmacyDraftAction,
  type OnboardState,
  type SlugCheck,
} from "@/app/actions/onboard";
import { slugifyPharmacyName } from "@/app/lib/slug";

type Existing = {
  id: string; slug: string; name: string; legalName: string | null; tagline: string | null;
  description: string | null; licenseNumber: string | null; ppbPremisesNumber: string | null;
  phone: string | null; whatsapp: string | null; email: string | null; city: string | null;
  county: string | null; status: string;
} | null;

const STEPS = ["Your pharmacy", "Location & contact", "Review & submit"];

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-[#0c1a14]">
    <span>{label}</span>{hint && <span className="ml-2 text-xs font-normal text-[#82918a]">{hint}</span>}
    {children}
    {error && <span className="mt-1 block text-xs font-medium text-rose-700" role="alert">{error}</span>}
  </label>;
}

export default function OnboardWizard({ signedIn, existing }: { signedIn: boolean; existing: Existing }) {
  const [step, setStep] = useState(existing ? 1 : 0);
  const [name, setName] = useState(existing?.name || "");
  const [slug, setSlug] = useState(existing?.slug || "");
  const [legalName, setLegalName] = useState(existing?.legalName || "");
  const [licenseNumber, setLicenseNumber] = useState(existing?.ppbPremisesNumber || existing?.licenseNumber || "");
  const [pharmacyId, setPharmacyId] = useState(existing?.id || "");
  const [status, setStatus] = useState(existing?.status || "draft");
  const [city, setCity] = useState(existing?.city || "");
  const [county, setCounty] = useState(existing?.county || "");
  const [phone, setPhone] = useState(existing?.phone || "");
  const [whatsapp, setWhatsapp] = useState(existing?.whatsapp || "");
  const [publicEmail, setPublicEmail] = useState(existing?.email || "");
  const [tagline, setTagline] = useState(existing?.tagline || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [slugCheck, setSlugCheck] = useState<SlugCheck | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [isChecking, startChecking] = useTransition();

  const [createState, createAction, createPending] = useActionState(createPharmacyDraftAction, {} as OnboardState);
  const [updateState, updateAction, updatePending] = useActionState(updatePharmacyDraftAction, {} as OnboardState);
  const [submitState, submitAction, submitPending] = useActionState(submitPharmacyApplicationAction, {} as OnboardState);

  const slugValue = useMemo(() => slug || slugifyPharmacyName(name), [slug, name]);
  const state = submitState.error || submitState.success ? submitState : updateState.error || updateState.success ? updateState : createState;
  const step1Valid = Boolean(name.trim() && slugValue && legalName.trim() && licenseNumber.trim());
  const step2Valid = Boolean(city.trim() && phone.trim());

  useEffect(() => {
    if (!slugValue || slugValue.length < 2) { setSlugCheck(null); return; }
    let cancelled = false;
    setCheckingSlug(true);
    const timer = window.setTimeout(() => {
      startChecking(async () => {
        const result = await checkPharmacySlugAction(slugValue);
        if (!cancelled) { setSlugCheck(result); setCheckingSlug(false); }
      });
    }, 450);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [slugValue, startChecking]);

  useEffect(() => {
    if (createState.pharmacyId) {
      setPharmacyId(createState.pharmacyId);
      if (createState.slug) setSlug(createState.slug);
      setStatus("draft");
      setStep(1);
    }
  }, [createState.pharmacyId, createState.slug]);
  useEffect(() => { if (submitState.success) setStatus("submitted"); }, [submitState.success]);

  if (["submitted", "under_review"].includes(status)) return <div className="rounded-[2rem] border border-teal-900/10 bg-white p-7 text-center shadow-[0_20px_60px_rgba(8,40,32,0.08)] sm:p-10">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-2xl text-[#0d6e5a]">✓</div>
    <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#0d6e5a]">Application received</p>
    <h2 className="mt-2 text-3xl font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>{name || "Your pharmacy"} is under review</h2>
    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#5a6b62]">Our network team will verify the premises licence and location. Your public storefront stays private until approval.</p>
    <p className="mt-6 text-xs text-[#82918a]">Application ID {pharmacyId.slice(0, 8)}</p>
  </div>;

  return <div className="overflow-hidden rounded-[2rem] border border-teal-900/10 bg-white shadow-[0_20px_70px_rgba(8,40,32,0.08)]">
    <div className="border-b border-slate-100 px-5 pb-5 pt-5 sm:px-8">
      <div className="flex items-center justify-between text-xs font-semibold text-[#687871]"><span>Step {step + 1} of 3</span><span>{step === 0 ? "About your pharmacy" : step === 1 ? "How patients reach you" : "Ready for verification"}</span></div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0d6e5a] transition-all duration-500" style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
      <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Onboarding progress">{STEPS.map((label, i) => <li key={label} className={`rounded-xl px-2 py-2 text-center text-[11px] font-semibold ${i === step ? "bg-[#0d6e5a] text-white" : i < step ? "bg-teal-50 text-[#0d6e5a]" : "bg-slate-50 text-slate-400"}`}>{i < step ? "✓ " : ""}{label}</li>)}</ol>
    </div>

    <div className="px-5 py-6 sm:px-8 sm:py-8">
      {state.error && <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-800" role="alert">{state.error}</div>}
      {state.success && <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-800" role="status">{state.success}</div>}

      {step === 0 && <form action={createAction} className="space-y-5">
        {signedIn ? <div className="rounded-2xl bg-[#f1faf7] px-4 py-3 text-sm text-[#28584d]"><strong>You're signed in.</strong> We'll attach this pharmacy to your existing Aether account and keep your draft private.</div> : <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-[#52635b]">Already started? <Link href="/login?next=/onboard" className="font-semibold text-[#0d6e5a]">Sign in instead</Link> — your draft will be picked up automatically.</div>}
        {!signedIn && <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name"><input name="fullName" required autoComplete="name" className="input-admin mt-1.5" placeholder="e.g. Jane Wanjiku" /></Field>
          <Field label="Work email"><input name="email" required type="email" autoComplete="email" className="input-admin mt-1.5" placeholder="you@pharmacy.co.ke" /></Field>
          <Field label="Password" hint="Use 8+ characters"><input name="password" required type="password" autoComplete="new-password" className="input-admin mt-1.5 sm:col-span-2" /></Field>
        </div>}
        <Field label="Trading name" hint="What patients see"><input name="name" required value={name} onChange={e => { setName(e.target.value); if (!existing) setSlug(slugifyPharmacyName(e.target.value)); }} className="input-admin mt-1.5" placeholder="e.g. Mashariki Pharmacy" /></Field>
        <Field label="Public pharmacy address" hint="Your shareable Aether URL">
          <div className="mt-1.5 flex items-center rounded-xl border border-slate-200 bg-slate-50 focus-within:border-[#0d6e5a] focus-within:ring-2 focus-within:ring-teal-100"><span className="pl-4 text-sm text-slate-400">/p/</span><input name="slug" value={slugValue} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className="w-full border-0 bg-transparent px-2 py-3.5 text-sm outline-none" aria-describedby="slug-status" />{(checkingSlug || isChecking) && <span className="mr-3 text-xs text-slate-400">Checking…</span>}</div>
          <span id="slug-status" className={`mt-1.5 block text-xs ${slugCheck?.status === "taken" || slugCheck?.status === "invalid" ? "text-rose-700" : "text-[#0d6e5a]"}`}>{slugCheck?.message || "We'll check availability as you type."}</span>
        </Field>
        <Field label="Legal name" hint="As registered"><input name="legalName" required value={legalName} onChange={e => setLegalName(e.target.value)} className="input-admin mt-1.5" placeholder="Legal business name" /></Field>
        <Field label="PPB / premises licence number" hint="Required for verification"><input name="licenseNumber" required value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} className="input-admin mt-1.5" placeholder="Enter licence number" /></Field>
        <button className="btn-primary w-full" type="submit" disabled={createPending || !step1Valid || slugCheck?.status === "taken" || slugCheck?.status === "invalid"}>{createPending ? "Saving your pharmacy…" : "Save & continue"}</button>
      </form>}

      {step === 1 && pharmacyId && <form action={fd => { fd.set("pharmacyId", pharmacyId); fd.set("name", name); fd.set("legalName", legalName); fd.set("ppbPremisesNumber", licenseNumber); fd.set("licenseNumber", licenseNumber); fd.set("city", city); fd.set("county", county); fd.set("phone", phone); fd.set("whatsapp", whatsapp); fd.set("publicEmail", publicEmail); fd.set("tagline", tagline); fd.set("description", description); updateAction(fd); }} className="space-y-5">
        <div className="rounded-2xl bg-[#f7fbf9] px-4 py-4"><p className="font-semibold text-[#164c40]">{name}</p><p className="mt-1 text-xs text-[#708078]">Your patients will find you at <code>/p/{slugValue}</code></p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City"><input value={city} onChange={e => setCity(e.target.value)} required className="input-admin mt-1.5" placeholder="Nairobi" /></Field>
          <Field label="County"><input value={county} onChange={e => setCounty(e.target.value)} className="input-admin mt-1.5" placeholder="Nairobi County" /></Field>
          <Field label="Public phone"><input value={phone} onChange={e => setPhone(e.target.value)} required type="tel" className="input-admin mt-1.5" placeholder="07xx xxx xxx" /></Field>
          <Field label="WhatsApp" hint="Optional"><input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} type="tel" className="input-admin mt-1.5" placeholder="07xx xxx xxx" /></Field>
          <Field label="Public email" hint="Optional"><input value={publicEmail} onChange={e => setPublicEmail(e.target.value)} type="email" className="input-admin mt-1.5 sm:col-span-2" placeholder="hello@pharmacy.co.ke" /></Field>
          <Field label="Short tagline" hint="Optional"><input value={tagline} onChange={e => setTagline(e.target.value)} className="input-admin mt-1.5 sm:col-span-2" placeholder="Your neighbourhood pharmacy, built on trust" /></Field>
          <Field label="Short description" hint="Optional"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="input-admin mt-1.5 sm:col-span-2" placeholder="Tell patients what makes your pharmacy useful." /></Field>
        </div>
        <div className="flex gap-3"><button type="button" className="btn-ghost flex-1" onClick={() => setStep(0)}>Back</button><button className="btn-primary flex-[2]" type="submit" disabled={updatePending || !step2Valid}>{updatePending ? "Saving…" : "Save & review"}</button></div>
      </form>}

      {step === 2 && pharmacyId && <div className="space-y-5">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0d6e5a]">Final check</p><h2 className="mt-1 text-xl font-semibold text-[#0c1a14]">Everything looks ready</h2><p className="mt-1 text-sm leading-5 text-[#64736c]">We'll send this application to the Aether verification team. Nothing becomes public until you are approved.</p></div>
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
          {[['Pharmacy', name], ['Public address', `/p/${slugValue}`], ['Licence', licenseNumber], ['Location', [city, county].filter(Boolean).join(", ")], ['Phone', phone]].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 px-4 py-3 text-sm"><span className="text-[#7a8982]">{label}</span><span className="text-right font-medium text-[#18352d]">{value || "—"}</span></div>)}
        </div>
        <form action={submitAction} className="space-y-3"><input type="hidden" name="pharmacyId" value={pharmacyId} /><p className="text-xs leading-5 text-[#718079]">By submitting, you confirm the details above belong to your pharmacy and can be verified by Aether.</p><div className="flex gap-3"><button type="button" className="btn-ghost flex-1" onClick={() => setStep(1)}>Back</button><button className="btn-primary flex-[2]" type="submit" disabled={submitPending}>{submitPending ? "Submitting…" : "Submit for verification"}</button></div></form>
      </div>}
    </div>
  </div>;
}
