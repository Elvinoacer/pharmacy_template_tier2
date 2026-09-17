import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  MapPin,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { prismaUnscoped } from "@/app/lib/db";
import { requirePlatformAction } from "@/app/lib/platform/policy";
import { isPrivateR2Reference } from "@/app/lib/r2";
import {
  loadApprovalReadiness,
  loadLatestVerificationChecklist,
  loadLatestVerificationProfile,
  REQUIRED_REVIEW_CHECKS,
} from "@/app/lib/services/pharmacy-verification";
import VerificationChecklistForm from "@/app/components/platform/VerificationChecklistForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pharmacy verification" };

function Value({ value }: { value: string | null | undefined }) {
  return <span className="break-words text-sm font-semibold text-[#26352d] dark:text-teal-50/95">{value || "—"}</span>;
}

export default async function PharmacyVerificationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    await requirePlatformAction(["super_admin"], { stepUp: true });
  } catch {
    redirect("/platform");
  }

  const { id } = await params;
  const [pharmacy, profileResult, checklistResult, readiness] = await Promise.all([
    prismaUnscoped.pharmacy.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        legalName: true,
        status: true,
        licenseNumber: true,
        ppbPremisesNumber: true,
        licenseDocumentUrl: true,
        kraPin: true,
        phone: true,
        email: true,
        city: true,
        county: true,
        latitude: true,
        longitude: true,
        owner: { select: { email: true, emailVerified: true, profile: { select: { fullName: true } } } },
      },
    }),
    loadLatestVerificationProfile(id),
    loadLatestVerificationChecklist(id),
    loadApprovalReadiness(id),
  ]);

  if (!pharmacy) notFound();
  const profile = profileResult?.profile ?? null;
  const checklist = checklistResult?.checklist ?? null;
  const hasPrivateLicense = Boolean(pharmacy.licenseDocumentUrl && isPrivateR2Reference(pharmacy.licenseDocumentUrl));
  const hasPrivateBusiness = Boolean(profile?.businessDocumentUrl && isPrivateR2Reference(profile.businessDocumentUrl));
  const mapUrl = pharmacy.latitude != null && pharmacy.longitude != null
    ? `https://www.google.com/maps?q=${pharmacy.latitude},${pharmacy.longitude}`
    : null;

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <Link href={`/platform/pharmacies/${pharmacy.id}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg text-xs font-semibold text-teal-700 hover:underline dark:text-teal-200">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to pharmacy review
      </Link>

      <header className="overflow-hidden rounded-3xl border border-[#dce7e1] bg-gradient-to-br from-white via-white to-teal-50/70 p-5 shadow-sm dark:border-white/10 dark:from-white/[0.06] dark:via-white/[0.035] dark:to-teal-400/[0.03] dark:shadow-none sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200/75">KYP verification dossier</p>
            <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-[#14211b] dark:text-white sm:text-4xl">{pharmacy.name}</h1>
            <p className="mt-2 text-sm text-[#68776e] dark:text-teal-100/65">{pharmacy.legalName || "No legal name supplied"} · {pharmacy.status.replace(/_/g, " ")}</p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 ${readiness.ready ? "border-emerald-200 bg-emerald-50 dark:border-emerald-400/30 dark:bg-emerald-400/10" : "border-amber-200 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-400/10"}`}>
            <div className="flex items-center gap-2">
              {readiness.ready ? <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-200" /> : <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-200" />}
              <span className={`text-sm font-semibold ${readiness.ready ? "text-emerald-900 dark:text-emerald-100" : "text-amber-950 dark:text-amber-100"}`}>
                {readiness.ready ? "Approval unlocked" : "Approval blocked"}
              </span>
            </div>
            <p className={`mt-1 text-xs ${readiness.ready ? "text-emerald-800/75 dark:text-emerald-100/70" : "text-amber-900/75 dark:text-amber-100/70"}`}>Verification risk score: {readiness.riskScore}/100</p>
          </div>
        </div>
      </header>

      {!readiness.ready ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-400/30 dark:bg-amber-400/10 sm:p-5">
          <h2 className="text-sm font-semibold text-amber-950 dark:text-amber-100">Outstanding approval requirements</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {[...readiness.profileMissing, ...readiness.checklistMissing].map((item) => (
              <div key={item} className="flex items-start gap-2 text-xs leading-5 text-amber-900 dark:text-amber-100/85">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {item}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none sm:p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-700 dark:text-teal-200" />
              <h2 className="text-base font-semibold text-[#17231d] dark:text-white">Submitted regulatory identity</h2>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Trading name", pharmacy.name],
                ["Legal name", pharmacy.legalName],
                ["PPB licence", pharmacy.licenseNumber],
                ["PPB premises/facility no.", pharmacy.ppbPremisesNumber],
                ["Facility type", profile?.facilityType],
                ["Licence expiry", profile?.licenseExpiryDate],
                ["Physical address", profile?.physicalAddress],
                ["City / county", [pharmacy.city, pharmacy.county].filter(Boolean).join(", ") || null],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[#f7faf8] p-3 dark:bg-white/[0.03]">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#718078] dark:text-teal-100/55">{label}</dt>
                  <dd className="mt-1"><Value value={value} /></dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {hasPrivateLicense ? (
                <a href={`/api/platform/verification-documents?pharmacyId=${pharmacy.id}&kind=license`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-800 hover:bg-teal-100 dark:border-teal-300/25 dark:bg-teal-300/10 dark:text-teal-100">
                  <FileSearch className="h-4 w-4" /> Open PPB licence evidence
                </a>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">No secure PPB licence image available. This is supporting evidence, not an automatic intake failure.</div>
              )}
              {hasPrivateBusiness ? (
                <a href={`/api/platform/verification-documents?pharmacyId=${pharmacy.id}&kind=business`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-800 hover:bg-teal-100 dark:border-teal-300/25 dark:bg-teal-300/10 dark:text-teal-100">
                  <FileSearch className="h-4 w-4" /> Open business evidence
                </a>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">No secure business-registration image available. Review the other evidence supplied.</div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none sm:p-5">
            <h2 className="text-base font-semibold text-[#17231d] dark:text-white">Responsible professional</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Name", profile?.superintendentName],
                ["PPB registration/enrolment", profile?.superintendentRegistrationNumber],
                ["Practice licence", profile?.superintendentPracticeLicenseNumber],
                ["Licence QR payload", profile?.licenseQrPayload],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[#f7faf8] p-3 dark:bg-white/[0.03]">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#718078] dark:text-teal-100/55">{label}</dt>
                  <dd className="mt-1"><Value value={value} /></dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none sm:p-5">
            <h2 className="text-base font-semibold text-[#17231d] dark:text-white">Ownership and applicant authority</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Ownership type", profile?.ownershipType],
                ["Business registration no.", profile?.businessRegistrationNumber],
                ["KRA PIN", pharmacy.kraPin],
                ["Applicant authority declared", profile?.applicantAuthorityConfirmed ? "Yes" : "No"],
                ["Owner account", pharmacy.owner?.profile?.fullName || pharmacy.owner?.email],
                ["Owner email verification", pharmacy.owner?.emailVerified ? "Verified" : "Not verified"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[#f7faf8] p-3 dark:bg-white/[0.03]">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#718078] dark:text-teal-100/55">{label}</dt>
                  <dd className="mt-1"><Value value={value} /></dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 shadow-sm dark:border-teal-300/15 dark:bg-teal-300/[0.045] dark:shadow-none sm:p-5">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-200" />
              <div>
                <h2 className="text-base font-semibold text-[#17231d] dark:text-white">Independent reviewer checks</h2>
                <p className="mt-1 text-xs leading-5 text-[#627168] dark:text-teal-100/60">Verify identity, applicant authority, premises/location and ownership independently. Use PPB registers and licensing evidence whenever those details are available; missing regulatory paperwork alone does not automatically reject intake.</p>
              </div>
            </div>
            <div className="mt-4">
              <VerificationChecklistForm pharmacyId={pharmacy.id} checklist={checklist} />
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-teal-500/20 bg-[var(--surface)] p-4">
            <h2 className="font-semibold">Evidence viewer</h2><p className="mt-2 text-xs leading-5 text-[var(--muted)]">Compare any supplied documents with the submitted identity and official registers where applicable. Every document access is recorded.</p>
            {([{ kind: "license", label: "PPB premises licence", available: hasPrivateLicense }, { kind: "business", label: "Business registration", available: hasPrivateBusiness }]).map(doc => <details key={doc.kind} className="mt-3 rounded-xl border border-[var(--border)] p-3"><summary className="cursor-pointer text-sm font-semibold">{doc.label}</summary>{doc.available ? <div className="mt-3"><Image unoptimized src={`/api/platform/verification-documents?pharmacyId=${pharmacy.id}&kind=${doc.kind}`} width={800} height={600} alt={doc.label} className="h-auto max-h-[36rem] w-full rounded-lg object-contain"/><a target="_blank" rel="noopener noreferrer" href={`/api/platform/verification-documents?pharmacyId=${pharmacy.id}&kind=${doc.kind}`} className="mt-3 inline-block min-h-10 text-xs font-semibold underline">Open full document</a></div> : <p className="mt-2 text-sm">Not supplied</p>}</details>)}
          </section>
          <section className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none sm:p-5">
            <h2 className="text-sm font-semibold text-[#17231d] dark:text-white">Current check status</h2>
            <div className="mt-3 space-y-2">
              {REQUIRED_REVIEW_CHECKS.map(({ key, label }) => {
                const passed = Boolean(checklist?.[key]);
                return (
                  <div key={key} className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${passed ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100" : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"}`}>
                    {passed ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
            {checklist?.checkedAt ? <p className="mt-3 text-[11px] text-[#718078] dark:text-teal-100/50">Last checked {new Date(checklist.checkedAt).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}</p> : null}
          </section>

          <section className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none sm:p-5">
            <h2 className="text-sm font-semibold text-[#17231d] dark:text-white">Location evidence</h2>
            <p className="mt-2 text-xs leading-5 text-[#718078] dark:text-teal-100/55">Submitted pin: {pharmacy.latitude ?? "—"}, {pharmacy.longitude ?? "—"}</p>
            {mapUrl ? (
              <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#dce7e1] px-3 text-xs font-semibold text-[#304139] hover:bg-[#f7faf8] dark:border-white/15 dark:text-teal-50 dark:hover:bg-white/5">
                <MapPin className="h-3.5 w-3.5" /> Open submitted pin <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </section>

          <section className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none sm:p-5">
            <h2 className="text-sm font-semibold text-[#17231d] dark:text-white">Evidence policy</h2>
            <p className="mt-2 text-xs leading-5 text-[#718078] dark:text-teal-100/55">Do not approve from owner declarations alone. Approval requires the mandatory reviewer checks for identity/contact, applicant authority, premises/location, ownership and no unresolved critical mismatch. PPB and licensing checks are supporting evidence and should be completed whenever sufficient regulatory information is available.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
