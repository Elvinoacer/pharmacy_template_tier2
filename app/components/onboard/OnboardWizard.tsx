"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPharmacyDraftAction, submitPharmacyApplicationAction, updatePharmacyDraftAction, type OnboardState } from "@/app/actions/onboard";
import { slugifyPharmacyName } from "@/app/lib/slug";
import PharmacyLocationCapture from "@/app/components/location/PharmacyLocationCapture";
import styles from "./OnboardWizard.module.css";

type Existing = {
  id: string; slug: string; name: string; legalName: string | null; tagline: string | null; description: string | null;
  licenseNumber: string | null; ppbPremisesNumber: string | null; phone: string | null; whatsapp: string | null; email: string | null;
  city: string | null; county: string | null; latitude: number | null; longitude: number | null; status: string;
} | null;

const STEPS = ["Applicant & pharmacy", "Premises & contact", "Review"];

export default function OnboardWizard({ signedIn, existing }: { signedIn: boolean; existing: Existing }) {
  const router = useRouter();
  const [step, setStep] = useState(existing ? 1 : 0);
  const [name, setName] = useState(existing?.name || "");
  const [slug, setSlug] = useState(existing?.slug || "");
  const [legalName, setLegalName] = useState(existing?.legalName || "");
  const [licenseNumber] = useState(existing?.licenseNumber || "");
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
  const isIdentityError = ["name", "slug"].includes(state.field || "");
  const isContactError = ["city", "phone", "location"].includes(state.field || "");

  useEffect(() => {
    if (createState.pharmacyId) {
      setPharmacyId(createState.pharmacyId);
      if (createState.slug) setSlug(createState.slug);
      setStatus("draft");
      router.refresh();
    }
  }, [createState.pharmacyId, createState.slug, router]);

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
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#5a6b62]">Super-admins independently verify the KYP dossier, PPB records, responsible professional, ownership evidence and precise premises location before approval.</p>
      <p className="mt-6 text-xs text-[#7a8b84]">Application ID {pharmacyId.slice(0, 8)}</p>
    </div>
  );

  if (status === "approved" || status === "active") return (
    <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/90 to-white p-6 text-center shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Verified</p>
      <h2 className="mt-3 text-2xl font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
        {name || "Your pharmacy"} is approved
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#5a6b62]">
        Next: finish the operational setup for your verified pharmacy profile.
      </p>
      <Link href="/admin/setup" className="btn-primary mt-6 inline-flex w-full justify-center sm:w-auto">
        Continue to setup
      </Link>
      <p className="mt-4 text-xs text-[#7a8b84]">
        Or jump straight to{" "}
        <Link href="/admin/settings/location" className="font-semibold text-[#0d6e5a] underline-offset-2 hover:underline">
          location &amp; contact
        </Link>
      </p>
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

        <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4 text-xs leading-5 text-teal-900">
          Start with the applicant and pharmacy identity only. After this draft is created, the next screen is the mandatory Know Your Pharmacy dossier where PPB, responsible-professional and business evidence are collected.
        </div>

        <label className="block text-sm font-medium text-[#0c1a14]">Trading name<input name="name" required value={name} onChange={(e) => { setName(e.target.value); if (!pharmacyId) setSlug(slugifyPharmacyName(e.target.value)); }} className="input-admin mt-1.5" placeholder="e.g. Coast Care Pharmacy" autoComplete="organization" aria-invalid={state.field === "name"} />{state.field === "name" && <p className="mt-1.5 text-xs leading-5 text-rose-700" role="alert">{state.error}</p>}</label>
        <label className="block text-sm font-medium text-[#0c1a14]">Public URL<span className="mt-1 block text-xs font-normal leading-5 text-[#7a8b84]">Reserved now, but the storefront stays hidden until verification and activation.</span><div className="mt-1.5 flex min-w-0 items-center gap-2"><span className="shrink-0 rounded-lg bg-slate-50 px-2.5 py-3 text-sm font-medium text-[#7a8b84]">/p/</span><input name="slug" required value={slug || liveSlug} onChange={(e) => setSlug(e.target.value.toLowerCase())} className="input-admin min-w-0" aria-invalid={state.field === "slug"} autoComplete="off" spellCheck={false} /></div>{state.field === "slug" && <p className="mt-1.5 text-xs leading-5 text-rose-700" role="alert">{state.error}</p>}</label>
        <label className="block text-sm font-medium text-[#0c1a14]">Legal / registered name<input name="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} className="input-admin mt-1.5" autoComplete="organization" /><span className="mt-1 block text-xs font-normal leading-5 text-[#7a8b84]">Use the registered entity name if it differs from the trading name.</span></label>
        <button className="btn-primary w-full justify-center sm:w-auto" type="submit" disabled={createPending || updatePending}>{createPending || updatePending ? "Creating secure profile…" : "Continue to Know Your Pharmacy"}</button>
      </form>}

      {step === 1 && pharmacyId && <form action={(fd) => { fd.set("pharmacyId", pharmacyId); nextStepAfterUpdate.current = 2; updateAction(fd); }} className="space-y-5 sm:space-y-4">
        <input type="hidden" name="pharmacyId" value={pharmacyId} /><input type="hidden" name="name" value={name} /><input type="hidden" name="slug" value={slug || liveSlug} /><input type="hidden" name="legalName" value={legalName} /><input type="hidden" name="licenseNumber" value={licenseNumber} />
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs leading-5 text-emerald-900">
          Know Your Pharmacy evidence is on file. Now verify the real premises and contact channels used by customers.
        </div>
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
          <label className="block text-sm font-medium text-[#0c1a14]">City<input name="city" value={city} onChange={(e) => setCity(e.target.value)} required className="input-admin mt-1.5" autoComplete="address-level2" />{state.field === "city" && <p className="mt-1.5 text-xs leading-5 text-rose-700" role="alert">{state.error}</p>}</label>
          <label className="block text-sm font-medium text-[#0c1a14]">County<input name="county" value={county} onChange={(e) => setCounty(e.target.value)} className="input-admin mt-1.5" autoComplete="address-level1" /></label>
        </div>
        <PharmacyLocationCapture pharmacyId={pharmacyId} initialLatitude={latitude} initialLongitude={longitude} onCoordinatesChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} />
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
          <label className="block text-sm font-medium text-[#0c1a14]">Public phone<input name="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="input-admin mt-1.5" autoComplete="tel" />{state.field === "phone" && <p className="mt-1.5 text-xs leading-5 text-rose-700" role="alert">{state.error}</p>}</label>
          <label className="block text-sm font-medium text-[#0c1a14]">WhatsApp<input name="whatsapp" type="tel" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="input-admin mt-1.5" autoComplete="tel" /></label>
          <label className="block text-sm font-medium text-[#0c1a14] sm:col-span-2">Public email<input name="publicEmail" type="email" inputMode="email" value={publicEmail} onChange={(e) => setPublicEmail(e.target.value)} className="input-admin mt-1.5" autoComplete="email" /></label>
          <label className="block text-sm font-medium text-[#0c1a14] sm:col-span-2">Tagline<input name="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} className="input-admin mt-1.5" placeholder="Your neighbourhood pharmacy, built on trust" /></label>
          <label className="block text-sm font-medium text-[#0c1a14] sm:col-span-2">Short description<textarea name="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="input-admin mt-1.5" /></label>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row"><button type="button" className="btn-ghost w-full justify-center sm:w-auto" onClick={() => setStep(0)}>Back</button><button className="btn-primary w-full justify-center sm:w-auto" type="submit" disabled={updatePending}>{updatePending ? "Saving…" : "Continue to verification review"}</button></div>
      </form>}

      {step === 2 && pharmacyId && <form action={submitAction} className="space-y-5 sm:space-y-4">
        <input type="hidden" name="pharmacyId" value={pharmacyId} />
        <div className="rounded-2xl bg-teal-50/80 p-4 text-sm leading-6 text-[#084c3f] sm:p-5">
          <p className="font-semibold">{name}</p><p className="mt-1 break-words">Public URL <code className="rounded bg-white px-1.5 py-0.5">/p/{slug || liveSlug}</code></p>
          <div className="mt-4 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs font-semibold text-emerald-800">Know Your Pharmacy dossier completed — final approval still requires independent platform-admin checks.</div>
          <dl className="mt-4 grid gap-3 text-xs text-[#5a6b62] sm:grid-cols-2">
            <div><dt className="font-semibold text-[#084c3f]">PPB / premises licence</dt><dd className="mt-0.5 break-words">{licenseNumber || "Captured in KYP dossier"}</dd></div>
            <div><dt className="font-semibold text-[#084c3f]">Location</dt><dd className="mt-0.5 break-words">{city}{county ? `, ${county}` : ""}</dd></div>
            <div><dt className="font-semibold text-[#084c3f]">Precise pin</dt><dd className="mt-0.5 break-words">{latitude != null && longitude != null ? `${latitude}, ${longitude}` : "Not captured yet"}</dd></div>
            <div><dt className="font-semibold text-[#084c3f]">Phone</dt><dd className="mt-0.5 break-words">{phone}</dd></div>
          </dl>
          <p className="mt-4 text-[#5a6b62]">Submitting sends the full KYP evidence package to Aether super-admins. Patients cannot see the storefront until independent verification is passed, the pharmacy is approved and it is explicitly listed.</p>
        </div>
        {submitState.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm leading-5 text-rose-800" role="alert">{submitState.error}</div>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row"><button type="button" className="btn-ghost w-full justify-center sm:w-auto" onClick={() => setStep(1)}>Back</button><button className="btn-primary w-full justify-center sm:w-auto" type="submit" disabled={submitPending}>{submitPending ? "Submitting KYP package…" : "Submit for independent verification"}</button></div>
      </form>}
    </div>
  );
}
