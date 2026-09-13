import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Pill,
  Rocket,
  ShieldCheck,
  Stethoscope,
  Store,
} from "lucide-react";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { loadPharmacySetup, type PharmacySetupCheckKey } from "@/app/lib/services/pharmacy-setup";
import { loadLatestVerificationProfile } from "@/app/lib/services/pharmacy-verification";
import { goLiveAction } from "@/app/actions/tenant-admin";
import {
  deferSetupMedicinesAction,
  saveSetupHoursAction,
  saveSetupProfileAction,
  saveSetupServiceAction,
} from "@/app/actions/pharmacy-setup";
import { SetupMedicineSearch } from "./SetupMedicineSearch";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finish pharmacy setup" };

type PageProps = {
  searchParams: Promise<{ step?: string; error?: string }>;
};

type HourRow = { day: string; time: string };

function hourRows(value: unknown): HourRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return [];
    const item = row as Record<string, unknown>;
    return typeof item.day === "string" && typeof item.time === "string"
      ? [{ day: item.day, time: item.time }]
      : [];
  });
}

function to24Hour(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "";
  let hours = Number(match[1]);
  const minutes = match[2];
  const suffix = match[3].toUpperCase();
  if (suffix === "AM" && hours === 12) hours = 0;
  if (suffix === "PM" && hours !== 12) hours += 12;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function rangeDefaults(rows: HourRow[], day: string): [string, string] {
  const saved = rows.find((row) => row.day === day)?.time || "";
  if (!saved || saved.toLowerCase() === "closed") return ["", ""];
  const parts = saved.split(/\s+[–-]\s+/);
  if (parts.length !== 2) return ["", ""];
  return [to24Hour(parts[0]), to24Hour(parts[1])];
}

const stepMeta = [
  { id: "hours", label: "Hours", minutes: 2, icon: Clock3, check: "hours" as PharmacySetupCheckKey },
  { id: "medicines", label: "Medicines", minutes: 2, icon: Pill, check: "medicines" as PharmacySetupCheckKey },
  { id: "services", label: "Services", minutes: 2, icon: Stethoscope, check: "services" as PharmacySetupCheckKey },
  { id: "profile", label: "Profile", minutes: 2, icon: Store, check: "about" as PharmacySetupCheckKey },
  { id: "billing", label: "Plan", minutes: 2, icon: CreditCard, check: "subscription" as PharmacySetupCheckKey },
] as const;

export default async function AdminSetupPage({ searchParams }: PageProps) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin/setup");

  const pharmacyId = user.activePharmacyId || user.memberships[0]?.pharmacyId;
  if (!pharmacyId) redirect("/onboard");

  const [pharmacy, readiness, verification, services, subscription, params] = await Promise.all([
    prismaUnscoped.pharmacy.findUnique({
      where: { id: pharmacyId },
      include: {
        settings: true,
        owner: { select: { email: true } },
      },
    }),
    loadPharmacySetup(pharmacyId),
    loadLatestVerificationProfile(pharmacyId),
    prismaUnscoped.pharmacyService.findMany({
      where: { pharmacyId, active: true },
      select: { id: true, title: true },
      orderBy: { createdAt: "asc" },
      take: 4,
    }),
    prismaUnscoped.subscription.findFirst({
      where: { pharmacyId, status: { not: "cancelled" } },
      select: { status: true, currentPeriodEnd: true },
      orderBy: { createdAt: "desc" },
    }),
    searchParams,
  ]);

  if (!pharmacy) redirect("/onboard");
  if (!pharmacy.verifiedAt || !["approved", "active"].includes(pharmacy.status)) redirect("/onboard");
  if (pharmacy.setupCompletedAt && pharmacy.status === "active" && pharmacy.listed && readiness.ready) {
    redirect("/admin");
  }

  const check = (key: PharmacySetupCheckKey) => readiness.checks.find((item) => item.key === key)?.ok === true;
  const completed = stepMeta.filter((step) => check(step.check)).length;
  const firstIncomplete = stepMeta.findIndex((step) => !check(step.check));
  const launchUnlocked = firstIncomplete === -1 && readiness.ready;
  const defaultIndex = launchUnlocked ? stepMeta.length : Math.max(firstIncomplete, 0);
  const requestedIndex = stepMeta.findIndex((step) => step.id === params.step);
  const requestedLaunch = params.step === "launch";

  let activeIndex = defaultIndex;
  if (requestedLaunch && launchUnlocked) activeIndex = stepMeta.length;
  else if (requestedIndex >= 0 && (launchUnlocked || requestedIndex <= defaultIndex)) activeIndex = requestedIndex;

  const activeStep = activeIndex === stepMeta.length ? "launch" : stepMeta[activeIndex].id;
  const minutesLeft = stepMeta
    .filter((step) => !check(step.check))
    .reduce((sum, step) => sum + step.minutes, 0);
  const completion = Math.round((completed / stepMeta.length) * 100);

  const settings = pharmacy.settings;
  const verifiedAddress = verification?.profile.physicalAddress || settings?.addressLine1 || "Verified premises";
  const publicEmail = settings?.email || pharmacy.email || pharmacy.owner?.email || "—";
  const publicPhone = settings?.phone || pharmacy.phone || "—";
  const latitude = settings?.latitude ?? pharmacy.latitude;
  const longitude = settings?.longitude ?? pharmacy.longitude;
  const mapHref =
    latitude != null && longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`
      : null;
  const savedHours = hourRows(settings?.hours);
  const [weekdayOpen, weekdayClose] = rangeDefaults(savedHours, "Monday – Friday");
  const [saturdayOpen, saturdayClose] = rangeDefaults(savedHours, "Saturday");
  const [sundayOpen, sundayClose] = rangeDefaults(savedHours, "Sunday");
  const aboutDefault = settings?.about || pharmacy.description || "";
  const taglineDefault = settings?.tagline || pharmacy.tagline || "";

  const stageHref = (index: number) => `/admin/setup?step=${stepMeta[index].id}`;
  const medicineLaunchLabel =
    readiness.counts.medicines > 0
      ? `${readiness.counts.medicines} medicine${readiness.counts.medicines === 1 ? "" : "s"} listed`
      : "Medicines can be added later";

  return (
    <main className="min-h-screen bg-[#f5f7f5] text-slate-900 dark:bg-[#08110e] dark:text-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Aether · Pharmacy setup</p>
            <h1 className="mt-1 truncate text-xl font-bold tracking-tight sm:text-2xl">{pharmacy.name}</h1>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified
          </span>
        </header>

        <section className="mb-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span>{completed}/{stepMeta.length} ready</span>
                <span className="text-slate-300 dark:text-white/20">·</span>
                <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-300"><Clock3 className="h-3.5 w-3.5" /> {minutesLeft ? `≈${minutesLeft} min left` : "Final step"}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Saved to your account · return anytime</p>
            </div>
            <div className="w-full sm:max-w-xs">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}>
                <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500" style={{ width: `${completion}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-slate-100 sm:grid-cols-6 dark:border-white/[0.07]">
            {stepMeta.map((step, index) => {
              const Icon = step.icon;
              const isDone = check(step.check);
              const isCurrent = activeIndex === index;
              const available = launchUnlocked || index <= defaultIndex;
              const content = (
                <span className={`flex min-h-16 flex-col items-center justify-center gap-1 px-2 text-[10px] font-semibold sm:text-xs ${isCurrent ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : isDone ? "text-emerald-700 dark:text-emerald-300" : "text-slate-400"}`}>
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : available ? <Icon className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                  {step.label}
                </span>
              );
              return available ? <Link key={step.id} href={stageHref(index)}>{content}</Link> : <span key={step.id}>{content}</span>;
            })}
            <Link href={launchUnlocked ? "/admin/setup?step=launch" : `/admin/setup?step=${stepMeta[defaultIndex].id}`} className={activeStep === "launch" ? "bg-emerald-500/10" : ""}>
              <span className={`flex min-h-16 flex-col items-center justify-center gap-1 px-2 text-[10px] font-semibold sm:text-xs ${launchUnlocked ? "text-emerald-700 dark:text-emerald-300" : "text-slate-400"}`}>
                {launchUnlocked ? <Rocket className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                Finish
              </span>
            </Link>
          </div>
        </section>

        <section className="mb-4 grid gap-2 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-3 sm:grid-cols-3 sm:p-4">
          <div className="flex min-w-0 items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
            <div className="min-w-0"><p className="truncate text-xs font-semibold">{verifiedAddress}</p><p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{[pharmacy.city, pharmacy.county].filter(Boolean).join(", ")}</p></div>
          </div>
          <div className="flex min-w-0 items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" /><span className="truncate text-xs font-medium">{publicPhone}</span></div>
          <div className="flex min-w-0 items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" /><span className="truncate text-xs font-medium">{publicEmail}</span></div>
          {mapHref ? <a href={mapHref} target="_blank" rel="noreferrer" className="sm:col-span-3 inline-flex w-fit items-center gap-1 text-[10px] font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300">Open verified map pin <ArrowRight className="h-3 w-3" /></a> : null}
        </section>

        {params.error ? (
          <p role="alert" className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-800 dark:text-rose-100">{params.error}</p>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-white/10 dark:bg-white/[0.04]">
          {activeStep === "hours" ? (
            <div className="mx-auto max-w-2xl">
              <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Step 1</p><h2 className="mt-1 text-2xl font-bold">When are you open?</h2></div>
              <form action={saveSetupHoursAction} className="space-y-3">
                {[
                  ["Monday – Friday", "weekday", weekdayOpen, weekdayClose],
                  ["Saturday", "saturday", saturdayOpen, saturdayClose],
                  ["Sunday", "sunday", sundayOpen, sundayClose],
                ].map(([label, key, open, close]) => (
                  <div key={key} className="grid gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-[1fr_9rem_9rem] sm:items-center dark:bg-white/[0.04]">
                    <span className="text-sm font-semibold">{label}</span>
                    <label className="text-[10px] font-semibold text-slate-500">Open<input type="time" name={`${key}Open`} defaultValue={open} className="mt-1 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm dark:border-white/10 dark:bg-black/20" /></label>
                    <label className="text-[10px] font-semibold text-slate-500">Close<input type="time" name={`${key}Close`} defaultValue={close} className="mt-1 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm dark:border-white/10 dark:bg-black/20" /></label>
                  </div>
                ))}
                <p className="text-[11px] text-slate-500">Leave both weekend times blank if closed.</p>
                <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 sm:w-auto">Save & continue <ArrowRight className="h-4 w-4" /></button>
              </form>
            </div>
          ) : null}

          {activeStep === "medicines" ? (
            <div className="mx-auto max-w-2xl">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Step 2</p>
                  <h2 className="mt-1 text-2xl font-bold">Add medicines if you have them</h2>
                  <p className="mt-2 max-w-lg text-xs leading-5 text-slate-500 dark:text-slate-400">Optional. Add one medicine now, or continue and build your catalogue from the dashboard later.</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold dark:bg-white/10">
                  {readiness.counts.medicines > 0 ? `${readiness.counts.medicines} added` : readiness.medicineDeferred ? "Add later" : "Optional"}
                </span>
              </div>

              {readiness.counts.medicines > 0 ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-100"><CheckCircle2 className="h-5 w-5" /> {readiness.counts.medicines} medicine{readiness.counts.medicines === 1 ? "" : "s"} ready for your public catalogue</p>
                  <p className="mt-2 text-xs leading-5 text-emerald-900/70 dark:text-emerald-100/70">You can add, import or update the rest after launch.</p>
                  <Link href="/admin/setup?step=services" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white">Continue <ArrowRight className="h-4 w-4" /></Link>
                </div>
              ) : readiness.medicineDeferred ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-100"><CheckCircle2 className="h-5 w-5" /> Medicines can be added later</p>
                  <p className="mt-2 text-xs leading-5 text-emerald-900/70 dark:text-emerald-100/70">Your pharmacy can still launch. The public medicine catalogue will simply stay empty until you add stock.</p>
                  <Link href="/admin/setup?step=services" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white">Continue <ArrowRight className="h-4 w-4" /></Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <SetupMedicineSearch />
                  <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"><span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />or<span className="h-px flex-1 bg-slate-200 dark:bg-white/10" /></div>
                  <form action={deferSetupMedicinesAction} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">No medicines to add right now?</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">That is okay. This choice is saved and will not block launch.</p>
                      </div>
                      <button type="submit" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-100">I’ll add medicines later <ArrowRight className="h-4 w-4" /></button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : null}

          {activeStep === "services" ? (
            <div className="mx-auto max-w-2xl">
              <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Step 3</p><h2 className="mt-1 text-2xl font-bold">What care do you offer?</h2></div>
              {check("services") ? (
                <div><div className="grid gap-2 sm:grid-cols-2">{services.map((service) => <div key={service.id} className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-sm font-semibold dark:bg-white/[0.04]"><Check className="h-4 w-4 text-emerald-600" />{service.title}</div>)}</div><Link href="/admin/setup?step=profile" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white">Continue <ArrowRight className="h-4 w-4" /></Link></div>
              ) : (
                <form action={saveSetupServiceAction} className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Service name<input name="title" required placeholder="e.g. Blood pressure check" className="mt-1 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-black/20" /></label>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">What happens?<textarea name="description" required minLength={12} rows={3} placeholder="A quick blood pressure reading with pharmacist guidance." className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-white/10 dark:bg-black/20" /></label>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Price (KES) · optional<input name="price" type="number" min="1" inputMode="decimal" className="mt-1 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-black/20" /></label>
                  <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 sm:w-auto">Save & continue <ArrowRight className="h-4 w-4" /></button>
                </form>
              )}
            </div>
          ) : null}

          {activeStep === "profile" ? (
            <div className="mx-auto max-w-2xl">
              <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Step 4</p><h2 className="mt-1 text-2xl font-bold">A short public profile</h2></div>
              <form action={saveSetupProfileAction} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Tagline · optional<input name="tagline" defaultValue={taglineDefault} maxLength={120} placeholder="Care close to home" className="mt-1 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-black/20" /></label>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">About your pharmacy<textarea name="about" defaultValue={aboutDefault} required minLength={50} rows={4} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm dark:border-white/10 dark:bg-black/20" /></label>
                <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 sm:w-auto">Save & continue <ArrowRight className="h-4 w-4" /></button>
              </form>
            </div>
          ) : null}

          {activeStep === "billing" ? (
            <div className="mx-auto max-w-2xl text-center">
              <CreditCard className="mx-auto h-9 w-9 text-emerald-600" />
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Step 5</p>
              <h2 className="mt-1 text-2xl font-bold">Activate your plan</h2>
              <div className="mx-auto mt-5 max-w-sm rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]"><p className="text-3xl font-bold">KES 500<span className="text-sm font-medium text-slate-500"> / month</span></p><p className="mt-2 text-xs text-slate-500">{subscription ? `Status: ${subscription.status.replaceAll("_", " ")}` : "Ready for activation"}</p></div>
              {check("subscription") ? <Link href="/admin/setup?step=launch" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white">Continue <ArrowRight className="h-4 w-4" /></Link> : <Link href="/onboard/billing" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white">Open secure billing <ArrowRight className="h-4 w-4" /></Link>}
            </div>
          ) : null}

          {activeStep === "launch" ? (
            <div className="mx-auto max-w-xl py-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><Rocket className="h-7 w-7" /></div>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Setup complete</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight">Ready for patients</h2>
              <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-2 text-left text-xs">{["Verified premises", "Opening hours", medicineLaunchLabel, "Pharmacy service", "Public profile", "Active plan"].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 font-semibold dark:bg-white/[0.04]"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />{item}</div>)}</div>
              <form action={goLiveAction} className="mt-6"><button type="submit" disabled={!readiness.ready} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 sm:w-auto">Publish & open dashboard <ArrowRight className="h-4 w-4" /></button></form>
              <p className="mt-3 text-[11px] text-slate-500">You won’t return to setup after this.</p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
