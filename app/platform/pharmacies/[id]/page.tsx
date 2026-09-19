import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileSearch,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  Trash2,
  UserRound,
} from "lucide-react";
import { prismaUnscoped } from "@/app/lib/db";
import {
  impersonatePharmacyAction,
  removeSeededPharmacyAction,
  setPharmacyLiveAction,
  suspendPharmacyAction,
  updatePharmacyAction,
} from "@/app/actions/platform";
import ReviewDecisionForm from "@/app/components/platform/ReviewDecisionForm";
import VerificationChecklistForm from "@/app/components/platform/VerificationChecklistForm";
import {
  loadApprovalReadiness,
  loadLatestVerificationChecklist,
  loadLatestVerificationProfile,
  REQUIRED_REVIEW_CHECKS,
} from "@/app/lib/services/pharmacy-verification";
import { isPrivateR2Reference } from "@/app/lib/r2";
import {
  daysSince,
  formatStatus,
  priorityBadgeClass,
  priorityLabel,
  statusBadgeClass,
  verificationPriority,
} from "@/app/components/platform/status";

export const dynamic = "force-dynamic";

const inputCls =
  "mt-1.5 min-h-11 w-full rounded-xl border border-[#cfdcd4] bg-white px-3 py-2.5 text-sm text-[#17231d] outline-none transition placeholder:text-[#8c9891] focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 dark:border-white/15 dark:bg-black/25 dark:text-white dark:placeholder:text-teal-100/35 dark:focus:border-teal-300/50 dark:focus:ring-teal-300/10";

const cardCls =
  "rounded-3xl border border-[#dce7e1] bg-white shadow-[0_18px_55px_rgba(20,33,27,0.06)] dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none";

const eyebrowCls =
  "text-[10px] font-bold uppercase tracking-[0.16em] text-[#718078] dark:text-teal-100/55";

function SectionHeading({
  icon,
  eyebrow,
  title,
  copy,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  copy?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-300/20 dark:bg-teal-300/10 dark:text-teal-200">
        {icon}
      </span>
      <div className="min-w-0">
        <p className={eyebrowCls}>{eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#17231d] dark:text-white">
          {title}
        </h2>
        {copy ? (
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[#6d7b73] dark:text-teal-100/55">
            {copy}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DataField({
  label,
  value,
  mono = false,
  className = "",
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
  className?: string;
}) {
  const present = value !== null && value !== undefined && String(value).trim() !== "";

  return (
    <div
      className={`min-w-0 rounded-2xl border border-[#e3ebe6] bg-[#f8faf9] px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.025] ${className}`}
    >
      <dt className={eyebrowCls}>{label}</dt>
      <dd
        className={`mt-1.5 break-words text-sm leading-5 ${
          present
            ? "font-semibold text-[#26352d] dark:text-teal-50/95"
            : "font-medium text-[#9aa59f] dark:text-teal-100/30"
        } ${mono && present ? "font-mono text-[12px]" : ""}`}
      >
        {present ? String(value) : "Not provided"}
      </dd>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  state = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  state?: "neutral" | "good" | "warn";
}) {
  const tone =
    state === "good"
      ? "text-emerald-700 dark:text-emerald-200"
      : state === "warn"
        ? "text-amber-700 dark:text-amber-200"
        : "text-[#17231d] dark:text-white";

  return (
    <div className="rounded-2xl border border-[#e1e9e4] bg-white/70 px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.025]">
      <p className={eyebrowCls}>{label}</p>
      <p className={`mt-1.5 text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-1 text-[11px] leading-4 text-[#7b8881] dark:text-teal-100/45">{detail}</p>
    </div>
  );
}

export default async function PharmacyReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [pharmacy, profileResult, checklistResult, readiness] = await Promise.all([
    prismaUnscoped.pharmacy
      .findUnique({
        where: { id },
        include: {
          owner: {
            select: {
              email: true,
              emailVerified: true,
              platformAdmin: true,
              profile: { select: { fullName: true } },
            },
          },
          memberships: { include: { user: { select: { email: true, role: true } } } },
          onboardingEvents: { orderBy: { createdAt: "desc" }, take: 16 },
        },
      })
      .catch(() => null),
    loadLatestVerificationProfile(id).catch(() => null),
    loadLatestVerificationChecklist(id).catch(() => null),
    loadApprovalReadiness(id).catch(() => ({
      ready: false,
      profileMissing: ["Unable to load owner verification readiness"],
      checklistMissing: ["Unable to load reviewer checklist readiness"],
      checklistStale: false,
      riskScore: 100,
      profile: null,
      checklist: null,
    })),
  ]);

  if (!pharmacy) notFound();

  const profile = profileResult?.profile ?? readiness.profile ?? null;
  const checklist = checklistResult?.checklist ?? readiness.checklist ?? null;
  const priority = verificationPriority(
    pharmacy.status,
    pharmacy.submittedAt,
    pharmacy.createdAt,
  );
  const age = daysSince(pharmacy.submittedAt ?? pharmacy.createdAt);
  const hasPin = pharmacy.latitude != null && pharmacy.longitude != null;
  const mapEmbed = hasPin
    ? `https://maps.google.com/maps?q=${pharmacy.latitude},${pharmacy.longitude}&z=16&output=embed`
    : null;
  const hasPrivateLicense = Boolean(
    pharmacy.licenseDocumentUrl && isPrivateR2Reference(pharmacy.licenseDocumentUrl),
  );
  const hasPrivateBusiness = Boolean(
    profile?.businessDocumentUrl && isPrivateR2Reference(profile.businessDocumentUrl),
  );
  const reviewerChecksDone = REQUIRED_REVIEW_CHECKS.filter(({ key }) => Boolean(checklist?.[key])).length;
  const reviewerChecksTotal = REQUIRED_REVIEW_CHECKS.length;
  const dossierMissing = readiness.profileMissing.length;
  const allMissing = [...readiness.profileMissing, ...readiness.checklistMissing];

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-5 pb-10 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/platform/applications"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-1 text-xs font-semibold text-teal-700 transition hover:text-teal-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-200/85 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Verification queue
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/platform/pharmacies/${pharmacy.id}/verification`}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-800 transition hover:bg-teal-100 dark:border-teal-300/25 dark:bg-teal-300/10 dark:text-teal-100 dark:hover:bg-teal-300/15"
          >
            Focused evidence view <ShieldCheck className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={`/p/${pharmacy.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#d7e1db] bg-white px-3 text-xs font-semibold text-[#405047] transition hover:border-teal-300 hover:text-teal-800 dark:border-white/15 dark:bg-white/5 dark:text-teal-50 dark:hover:bg-white/10"
          >
            Storefront <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <header className="relative overflow-hidden rounded-[28px] border border-[#dce7e1] bg-white shadow-[0_24px_70px_rgba(18,45,35,0.07)] dark:border-white/10 dark:bg-[#101816] dark:shadow-none">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.13),transparent_58%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.10),transparent_58%)]" />
        <div className="relative p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusBadgeClass(pharmacy.status)}`}
                >
                  {formatStatus(pharmacy.status)}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${priorityBadgeClass(priority)}`}
                >
                  {priorityLabel(priority)} priority
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    readiness.ready
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100"
                      : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"
                  }`}
                >
                  {readiness.ready ? "approval unlocked" : "verification incomplete"}
                </span>
                {pharmacy.isSeeded ? (
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-800 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-100">
                    Seeded directory record
                  </span>
                ) : null}
              </div>

              <h1
                className="mt-4 break-words text-3xl font-semibold tracking-[-0.035em] text-[#14211b] dark:text-white sm:text-4xl lg:text-[2.75rem]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {pharmacy.name}
              </h1>
              <p className="mt-2 max-w-4xl break-words text-sm leading-6 text-[#68776e] dark:text-teal-100/60">
                {pharmacy.legalName || "Legal name not supplied"}
                <span className="mx-2 opacity-40">•</span>/p/{pharmacy.slug}
                {age != null ? (
                  <>
                    <span className="mx-2 opacity-40">•</span>
                    {age === 0 ? "submitted today" : `${age} day${age === 1 ? "" : "s"} in queue`}
                  </>
                ) : null}
              </p>
              {pharmacy.tagline ? (
                <p className="mt-3 max-w-3xl text-sm font-medium text-[#3f5148] dark:text-teal-50/85">
                  “{pharmacy.tagline}”
                </p>
              ) : null}
            </div>

            <div
              className={`w-full rounded-2xl border p-4 xl:max-w-[21rem] ${
                readiness.ready
                  ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-400/25 dark:bg-emerald-400/10"
                  : "border-amber-200 bg-amber-50/80 dark:border-amber-400/25 dark:bg-amber-400/10"
              }`}
            >
              <div className="flex items-start gap-3">
                {readiness.ready ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-200" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-200" />
                )}
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      readiness.ready
                        ? "text-emerald-950 dark:text-emerald-100"
                        : "text-amber-950 dark:text-amber-100"
                    }`}
                  >
                    {readiness.ready ? "Ready for an approval decision" : `${allMissing.length} verification item${allMissing.length === 1 ? "" : "s"} still open`}
                  </p>
                  <p
                    className={`mt-1 text-xs leading-5 ${
                      readiness.ready
                        ? "text-emerald-800/75 dark:text-emerald-100/65"
                        : "text-amber-900/75 dark:text-amber-100/65"
                    }`}
                  >
                    Risk score {readiness.riskScore}/100. Approval remains server-blocked until the required owner dossier and independent reviewer checks pass.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-2.5 border-t border-[#e8eeea] pt-5 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/10">
            <Metric
              label="Owner dossier"
              value={dossierMissing === 0 ? "Complete" : `${dossierMissing} missing`}
              detail="Submitted regulatory identity and evidence"
              state={dossierMissing === 0 ? "good" : "warn"}
            />
            <Metric
              label="Reviewer controls"
              value={`${reviewerChecksDone}/${reviewerChecksTotal}`}
              detail={checklistResult?.stale ? "Checklist is stale after newer owner data" : "Independent checks saved"}
              state={reviewerChecksDone === reviewerChecksTotal && !checklistResult?.stale ? "good" : "warn"}
            />
            <Metric
              label="Risk score"
              value={`${readiness.riskScore}/100`}
              detail="Lower is better after completed controls"
              state={readiness.ready ? "good" : readiness.riskScore >= 50 ? "warn" : "neutral"}
            />
            <Metric
              label="Queue age"
              value={age == null ? "—" : age === 0 ? "Today" : `${age}d`}
              detail={pharmacy.submittedAt ? `Submitted ${new Date(pharmacy.submittedAt).toLocaleDateString("en-KE", { dateStyle: "medium" })}` : "No submission timestamp"}
            />
          </div>
        </div>
      </header>

      {pharmacy.isSeeded ? (
        <section className="rounded-3xl border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-400/25 dark:bg-sky-400/[0.07] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-white/70 text-sky-700 dark:border-sky-300/20 dark:bg-white/5 dark:text-sky-200">
                <Store className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-800/70 dark:text-sky-100/60">Directory starter data</p>
                <h2 className="mt-1 text-base font-semibold text-sky-950 dark:text-sky-50">This record was seeded for public directory coverage</h2>
                <p className="mt-1 text-xs leading-5 text-sky-900/75 dark:text-sky-100/65">
                  Added {pharmacy.seededAt ? new Date(pharmacy.seededAt).toLocaleDateString("en-KE", { dateStyle: "medium" }) : "as part of the directory seed"}. The public page does not expose this marker. Confirm the branch details before treating the listing as claimed.
                </p>
                {pharmacy.seededSourceUrl ? (
                  <a href={pharmacy.seededSourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-xs font-semibold text-sky-800 underline-offset-4 hover:underline dark:text-sky-200">
                    Open source page ↗
                  </a>
                ) : null}
              </div>
            </div>
            <form action={removeSeededPharmacyAction} className="shrink-0">
              <input type="hidden" name="pharmacyId" value={pharmacy.id} />
              <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-4 text-sm font-semibold text-rose-800 transition hover:bg-rose-50 dark:border-rose-400/35 dark:bg-transparent dark:text-rose-100 dark:hover:bg-rose-400/10">
                <Trash2 className="h-4 w-4" /> Remove seeded record
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {!readiness.ready && allMissing.length > 0 ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50/65 p-4 dark:border-amber-400/25 dark:bg-amber-400/[0.07] sm:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-200" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold text-amber-950 dark:text-amber-100">Outstanding approval requirements</h2>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800/65 dark:text-amber-100/55">Resolve before approval</span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {allMissing.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-amber-200/80 bg-white/55 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-300/15 dark:bg-black/10 dark:text-amber-100/85"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.72fr)] xl:gap-6">
        <main className="min-w-0 space-y-5 sm:space-y-6">
          <section className={`${cardCls} p-4 sm:p-6`}>
            <SectionHeading
              icon={<Building2 className="h-4 w-4" />}
              eyebrow="Submitted application"
              title="Regulatory identity"
              copy="All core identity details captured from the pharmacy application and KYP dossier are shown here so the reviewer does not have to hunt across pages."
            />

            <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DataField label="Trading name" value={pharmacy.name} />
              <DataField label="Legal name" value={pharmacy.legalName} />
              <DataField label="Storefront slug" value={`/p/${pharmacy.slug}`} mono />
              <DataField label="Facility type" value={profile?.facilityType} />
              <DataField label="PPB licence number" value={pharmacy.licenseNumber} />
              <DataField label="PPB premises / facility no." value={pharmacy.ppbPremisesNumber} />
              <DataField label="Licence expiry" value={profile?.licenseExpiryDate} />
              <DataField label="Physical premises address" value={profile?.physicalAddress} className="sm:col-span-2" />
            </dl>

            {(pharmacy.description || profile?.licenseQrPayload) ? (
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {pharmacy.description ? (
                  <div className="rounded-2xl border border-[#e3ebe6] bg-[#f8faf9] p-4 dark:border-white/10 dark:bg-white/[0.025]">
                    <p className={eyebrowCls}>Business description</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#405047] dark:text-teal-50/80">
                      {pharmacy.description}
                    </p>
                  </div>
                ) : null}
                {profile?.licenseQrPayload ? (
                  <details className="rounded-2xl border border-[#e3ebe6] bg-[#f8faf9] p-4 dark:border-white/10 dark:bg-white/[0.025]">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-[#26352d] dark:text-teal-50/95">
                      Licence QR payload <span className="ml-1 text-xs font-normal text-[#7d8982] dark:text-teal-100/45">— expand raw value</span>
                    </summary>
                    <p className="mt-3 break-all rounded-xl bg-white px-3 py-2.5 font-mono text-[11px] leading-5 text-[#56665d] dark:bg-black/20 dark:text-teal-100/65">
                      {profile.licenseQrPayload}
                    </p>
                  </details>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className={`${cardCls} p-4 sm:p-6`}>
            <SectionHeading
              icon={<UserRound className="h-4 w-4" />}
              eyebrow="Professional accountability"
              title="Responsible professional"
              copy="The superintendent or professional in charge should independently match the official PPB practitioner register."
            />
            <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DataField label="Full name" value={profile?.superintendentName} />
              <DataField label="PPB registration / enrolment" value={profile?.superintendentRegistrationNumber} />
              <DataField label="Practice licence number" value={profile?.superintendentPracticeLicenseNumber} />
            </dl>
          </section>

          <section className={`${cardCls} p-4 sm:p-6`}>
            <SectionHeading
              icon={<ShieldCheck className="h-4 w-4" />}
              eyebrow="Ownership & authority"
              title="Applicant legitimacy"
              copy="Review who owns the business, who submitted the application, and whether the account holder is authorized to act for the pharmacy."
            />
            <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DataField label="Ownership type" value={profile?.ownershipType} />
              <DataField label="Business registration no." value={profile?.businessRegistrationNumber} />
              <DataField label="KRA PIN" value={pharmacy.kraPin} />
              <DataField
                label="Applicant authority declared"
                value={profile ? (profile.applicantAuthorityConfirmed ? "Yes" : "No") : null}
              />
              <DataField label="Declared at" value={profile?.declaredAt ? new Date(profile.declaredAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : null} />
              <DataField label="Owner account" value={pharmacy.owner?.profile?.fullName || pharmacy.owner?.email} />
              <DataField label="Owner email" value={pharmacy.owner?.email} />
              <DataField label="Owner email verification" value={pharmacy.owner ? (pharmacy.owner.emailVerified ? "Verified" : "Not verified") : null} />
            </dl>
          </section>

          <section className={`${cardCls} overflow-hidden`}>
            <div className="p-4 sm:p-6">
              <SectionHeading
                icon={<MapPin className="h-4 w-4" />}
                eyebrow="Contact & premises"
                title="Location and public contact"
                copy="Compare the submitted physical location, map pin and contact identity with the licence and official registry records."
              />
              <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DataField label="Public phone" value={pharmacy.phone} />
                <DataField label="WhatsApp" value={pharmacy.whatsapp} />
                <DataField label="Public email" value={pharmacy.email} />
                <DataField label="City" value={pharmacy.city} />
                <DataField label="County" value={pharmacy.county} />
                <DataField
                  label="Coordinates"
                  value={hasPin ? `${pharmacy.latitude}, ${pharmacy.longitude}` : null}
                  mono
                />
              </dl>
            </div>

            {mapEmbed ? (
              <div className="border-t border-[#e4ebe7] dark:border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f7faf8] px-4 py-2.5 text-xs text-[#65736b] dark:bg-white/[0.025] dark:text-teal-100/55 sm:px-6">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" /> Submitted premises pin
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${pharmacy.latitude},${pharmacy.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-teal-700 hover:underline dark:text-teal-200"
                  >
                    Open in Maps ↗
                  </a>
                </div>
                <iframe
                  title="Submitted pharmacy premises"
                  src={mapEmbed}
                  className="h-64 w-full border-0 sm:h-72"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100 sm:px-6">
                No precise premises pin was submitted. Location verification should remain incomplete.
              </div>
            )}
          </section>

          <section className={`${cardCls} p-4 sm:p-6`}>
            <SectionHeading
              icon={<ShieldCheck className="h-4 w-4" />}
              eyebrow="Independent verification"
              title="Reviewer control checklist"
              copy="Verify each claim against official registers and submitted evidence. Saving this checklist directly controls whether approval can be completed."
            />
            {checklistResult?.stale ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">
                The previous checklist is stale because the pharmacy changed verification data after it was reviewed. Re-check the evidence and save a fresh checklist.
              </div>
            ) : null}
            <div className="mt-5">
              <VerificationChecklistForm pharmacyId={pharmacy.id} checklist={checklist} />
            </div>
          </section>

          <section className={`${cardCls} p-4 sm:p-6`}>
            <SectionHeading
              icon={<Clock3 className="h-4 w-4" />}
              eyebrow="Application history"
              title="Onboarding timeline"
              copy="A compact audit trail of the most recent application and verification events."
            />
            <ol className="mt-5 space-y-0">
              {pharmacy.onboardingEvents.map((event, index) => (
                <li key={event.id} className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
                  <div className="relative flex justify-center">
                    <span className="mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-teal-600 bg-white dark:border-teal-300 dark:bg-[#101816]" />
                    {index < pharmacy.onboardingEvents.length - 1 ? (
                      <span className="absolute bottom-[-0.15rem] top-4 w-px bg-[#dce7e1] dark:bg-white/10" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#68776e] dark:text-teal-100/55">
                        {event.type.replace(/_/g, " ")}
                      </p>
                      <span className="text-[10px] text-[#9aa59f] dark:text-teal-100/30">
                        {new Date(event.createdAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-sm leading-6 text-[#405047] dark:text-teal-50/80">{event.message}</p>
                  </div>
                </li>
              ))}
              {pharmacy.onboardingEvents.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-[#dce7e1] px-4 py-7 text-center text-xs text-[#7c8981] dark:border-white/10 dark:text-teal-100/45">
                  No onboarding events have been recorded yet.
                </li>
              ) : null}
            </ol>
          </section>

          <details className={`${cardCls} group overflow-hidden`}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 sm:p-6">
              <div>
                <p className={eyebrowCls}>Post-review operations</p>
                <h2 className="mt-1 text-lg font-semibold text-[#17231d] dark:text-white">Tenant record & marketplace controls</h2>
                <p className="mt-1 text-xs leading-5 text-[#718078] dark:text-teal-100/55">Editing and lifecycle controls are intentionally secondary to the verification workflow.</p>
              </div>
              <span className="rounded-full border border-[#dce7e1] px-3 py-1.5 text-xs font-semibold text-[#56665d] transition group-open:bg-[#f3f7f4] dark:border-white/15 dark:text-teal-100/65 dark:group-open:bg-white/5">
                Open controls
              </span>
            </summary>
            <div className="border-t border-[#e4ebe7] p-4 dark:border-white/10 sm:p-6">
              <form action={updatePharmacyAction}>
                <p className={eyebrowCls}>Tenant record</p>
                <h3 className="mt-1 text-base font-semibold text-[#17231d] dark:text-white">Edit public identity</h3>
                <input type="hidden" name="pharmacyId" value={pharmacy.id} />
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
                    Display name
                    <input name="name" defaultValue={pharmacy.name} required className={inputCls} />
                  </label>
                  <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
                    Storefront slug
                    <input name="slug" defaultValue={pharmacy.slug} required pattern="[a-z0-9][a-z0-9-]{1,60}" className={inputCls} />
                  </label>
                  <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
                    Legal name
                    <input name="legalName" defaultValue={pharmacy.legalName ?? ""} className={inputCls} />
                  </label>
                  <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
                    PPB / premises licence
                    <input name="licenseNumber" defaultValue={pharmacy.licenseNumber ?? ""} className={inputCls} />
                  </label>
                  <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
                    Phone
                    <input name="phone" type="tel" defaultValue={pharmacy.phone ?? ""} className={inputCls} />
                  </label>
                  <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
                    WhatsApp
                    <input name="whatsapp" type="tel" defaultValue={pharmacy.whatsapp ?? ""} className={inputCls} />
                  </label>
                  <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90 lg:col-span-2">
                    Email
                    <input name="email" type="email" defaultValue={pharmacy.email ?? ""} className={inputCls} />
                  </label>
                  <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
                    City
                    <input name="city" defaultValue={pharmacy.city ?? ""} className={inputCls} />
                  </label>
                  <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
                    County
                    <input name="county" defaultValue={pharmacy.county ?? ""} className={inputCls} />
                  </label>
                </div>
                <button type="submit" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 dark:bg-teal-300 dark:text-teal-950 dark:hover:bg-teal-200">
                  Save tenant details
                </button>
              </form>

              <div className="my-6 border-t border-[#e4ebe7] dark:border-white/10" />

              <div className="grid gap-3 lg:grid-cols-2">
                <form action={setPharmacyLiveAction} className="rounded-2xl border border-[#e3ebe6] bg-[#f8faf9] p-4 dark:border-white/10 dark:bg-white/[0.025]">
                  <input type="hidden" name="pharmacyId" value={pharmacy.id} />
                  <h3 className="text-sm font-semibold text-[#17231d] dark:text-white">Marketplace flags</h3>
                  <div className="mt-3 space-y-1 text-sm text-[#304139] dark:text-teal-50/90">
                    <label className="flex min-h-10 cursor-pointer items-center gap-3">
                      <input type="checkbox" name="listed" value="true" defaultChecked={pharmacy.listed} className="h-4 w-4 accent-teal-700" />
                      Listed on marketplace
                    </label>
                    <label className="flex min-h-10 cursor-pointer items-center gap-3">
                      <input type="checkbox" name="featured" value="true" defaultChecked={pharmacy.featured} className="h-4 w-4 accent-teal-700" />
                      Featured
                    </label>
                  </div>
                  <button type="submit" className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl border border-[#cfdcd4] bg-white px-3 text-xs font-semibold text-[#304139] transition hover:bg-teal-50 dark:border-white/20 dark:bg-white/5 dark:text-teal-50 dark:hover:bg-white/10">
                    Save flags
                  </button>
                </form>

                <form action={setPharmacyLiveAction} className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-400/25 dark:bg-emerald-400/5">
                  <input type="hidden" name="pharmacyId" value={pharmacy.id} />
                  <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Restore tenant</h3>
                  <p className="mt-1 text-xs leading-5 text-emerald-800/80 dark:text-emerald-100/60">Set active and list after suspension or pre-launch approval.</p>
                  <button type="submit" name="restore" value="true" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-300 bg-white/80 px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-400/40 dark:bg-transparent dark:text-emerald-100 dark:hover:bg-emerald-400/15">
                    Restore &amp; list
                  </button>
                </form>
              </div>

              <form action={suspendPharmacyAction} className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-400/30 dark:bg-rose-500/5">
                <input type="hidden" name="pharmacyId" value={pharmacy.id} />
                <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-100">Suspend tenant</h3>
                <p className="mt-1 text-xs leading-5 text-rose-800/80 dark:text-rose-100/60">Unlists the storefront and blocks staff access. The reason is written to the timeline.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="min-w-0 flex-1 text-sm font-medium text-rose-900 dark:text-rose-50">
                    Reason
                    <input name="reason" required placeholder="e.g. Licence expired — pending PPB renewal" className={inputCls} />
                  </label>
                  <button type="submit" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-800 transition hover:bg-rose-100 dark:border-rose-400/50 dark:bg-transparent dark:text-rose-100 dark:hover:bg-rose-400/15">
                    Suspend pharmacy
                  </button>
                </div>
              </form>
            </div>
          </details>
        </main>

        <aside className="min-w-0 space-y-5">
          <section className="rounded-3xl border border-teal-200 bg-gradient-to-b from-teal-50 to-white p-4 shadow-[0_18px_55px_rgba(20,120,105,0.08)] dark:border-teal-300/15 dark:from-teal-300/[0.08] dark:to-white/[0.025] dark:shadow-none sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-200/70">Decision desk</p>
            <h2 className="mt-1 text-lg font-semibold text-[#17231d] dark:text-white">Verification decision</h2>
            <p className="mt-1 text-xs leading-5 text-[#66756c] dark:text-teal-100/55">The server still enforces all mandatory checks even if an approval button is clicked early.</p>
            <div className="mt-4">
              <ReviewDecisionForm pharmacyId={pharmacy.id} currentStatus={pharmacy.status} />
            </div>
          </section>

          <section className={`${cardCls} p-4 sm:p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={eyebrowCls}>Evidence</p>
                <h2 className="mt-1 text-base font-semibold text-[#17231d] dark:text-white">Submitted documents</h2>
              </div>
              <FileSearch className="h-4 w-4 text-teal-700 dark:text-teal-200" />
            </div>
            <div className="mt-4 space-y-2.5">
              {hasPrivateLicense ? (
                <a href={`/api/platform/verification-documents?pharmacyId=${pharmacy.id}&kind=license`} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100">
                  <span>PPB licence evidence</span><ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">PPB licence evidence is not securely available.</div>
              )}
              {hasPrivateBusiness ? (
                <a href={`/api/platform/verification-documents?pharmacyId=${pharmacy.id}&kind=business`} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100">
                  <span>Business registration evidence</span><ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">Business-registration evidence is not securely available.</div>
              )}
            </div>
          </section>

          <section className={`${cardCls} p-4 sm:p-5`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={eyebrowCls}>Reviewer status</p>
                <h2 className="mt-1 text-base font-semibold text-[#17231d] dark:text-white">Control coverage</h2>
              </div>
              <span className="rounded-full bg-[#f2f7f4] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#56665d] dark:bg-white/5 dark:text-teal-100/70">{reviewerChecksDone}/{reviewerChecksTotal}</span>
            </div>
            <div className="mt-3 space-y-2">
              {REQUIRED_REVIEW_CHECKS.map(({ key, label }) => {
                const passed = Boolean(checklist?.[key]);
                return (
                  <div key={key} className="flex items-start gap-2 rounded-xl border border-[#e4ebe7] px-3 py-2.5 dark:border-white/10">
                    {passed ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-300" />
                    )}
                    <span className={`text-xs leading-5 ${passed ? "text-[#405047] dark:text-teal-50/80" : "text-[#7b6540] dark:text-amber-100/80"}`}>{label}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <details className={`${cardCls} group overflow-hidden`}>
            <summary className="cursor-pointer list-none p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={eyebrowCls}>Support access</p>
                  <h2 className="mt-1 text-base font-semibold text-[#17231d] dark:text-white">Open tenant admin</h2>
                </div>
                <span className="text-xs font-semibold text-teal-700 dark:text-teal-200">Configure</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-[#718078] dark:text-teal-100/55">Use only for auditable support work after recording the reason.</p>
            </summary>
            <form action={impersonatePharmacyAction} className="grid gap-3 border-t border-[#e4ebe7] p-4 dark:border-white/10 sm:p-5">
              <input type="hidden" name="pharmacyId" value={pharmacy.id} />
              <label className="text-sm font-medium text-[#304139] dark:text-teal-50/90">
                Support reason
                <input name="reason" required placeholder="What are you helping with?" className={inputCls} />
              </label>
              <label className="text-sm font-medium text-[#304139] dark:text-teal-50/90">
                Ticket reference
                <input name="ticketRef" placeholder="Ticket #" className={inputCls} />
              </label>
              <label className="text-sm font-medium text-[#304139] dark:text-teal-50/90">
                Access mode
                <select name="mode" className={inputCls} defaultValue="read_only">
                  <option value="read_only">Read only</option>
                  <option value="act_as_tenant">Act as tenant</option>
                </select>
              </label>
              <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#26352d] px-4 text-sm font-semibold text-white transition hover:bg-[#17231d] dark:bg-white dark:text-[#071512] dark:hover:bg-teal-100">Open admin support session</button>
            </form>
          </details>

          <section className={`${cardCls} p-4 sm:p-5`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={eyebrowCls}>People</p>
                <h2 className="mt-1 text-base font-semibold text-[#17231d] dark:text-white">Tenant staff</h2>
              </div>
              <span className="rounded-full bg-[#f3f7f4] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#56665d] dark:bg-white/5 dark:text-teal-100/65">{pharmacy.memberships.length}</span>
            </div>
            <ul className="mt-3 space-y-2">
              {pharmacy.memberships.map((membership) => (
                <li key={membership.id} className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-[#e4ece7] bg-[#fbfdfb] px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.025]">
                  <span className="min-w-0 flex-1 truncate text-xs text-[#304139] dark:text-teal-50/90">{membership.user.email}</span>
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-[#77857c] dark:text-teal-100/50">{membership.role}</span>
                </li>
              ))}
              {pharmacy.memberships.length === 0 ? (
                <li className="rounded-xl border border-dashed border-[#dce7e1] px-3 py-5 text-center text-xs text-[#7c8981] dark:border-white/10 dark:text-teal-100/45">No staff memberships.</li>
              ) : null}
            </ul>
            {pharmacy.owner ? (
              <a href={`mailto:${pharmacy.owner.email}`} className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-teal-700 hover:underline dark:text-teal-200">
                <Mail className="h-3.5 w-3.5" /> Email owner
              </a>
            ) : null}
          </section>

          <section className={`${cardCls} p-4 sm:p-5`}>
            <div className="flex items-center gap-2 text-xs text-[#6d7b73] dark:text-teal-100/55">
              <Phone className="h-3.5 w-3.5" />
              <span>{pharmacy.phone || "No public phone"}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-[#6d7b73] dark:text-teal-100/55">
              <Mail className="h-3.5 w-3.5" />
              <span className="break-all">{pharmacy.email || pharmacy.owner?.email || "No contact email"}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-[#6d7b73] dark:text-teal-100/55">
              <MapPin className="h-3.5 w-3.5" />
              <span>{[pharmacy.city, pharmacy.county].filter(Boolean).join(", ") || "No location label"}</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
