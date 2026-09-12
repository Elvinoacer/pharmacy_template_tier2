import Link from "next/link";
import PharmacyPricing from "@/app/components/onboard/PharmacyPricing";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { loadOwnerSubmissionReadiness } from "@/app/lib/services/pharmacy-verification";
import OnboardWizard from "@/app/components/onboard/OnboardWizard";
import VerificationDossierForm from "@/app/components/onboard/VerificationDossierForm";
import styles from "@/app/components/onboard/OnboardWizard.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pharmacy onboarding" };

const PREMISES_CONTACT_ITEMS = new Set([
  "pharmacy city",
  "public phone number",
  "precise premises map pin",
]);

export default async function OnboardPage() {
  const user = await getSessionUser().catch(() => null);
  let existing = null;
  let verificationReadiness: Awaited<ReturnType<typeof loadOwnerSubmissionReadiness>> | null = null;
  let verificationPharmacy = null;
  let ownerEmailVerified = false;
  let ownerEmail = user?.email || "";

  if (user) {
    const [owned, owner] = await Promise.all([
      prismaUnscoped.pharmacy.findFirst({
        where: { ownerUserId: user.id },
        orderBy: { createdAt: "desc" },
      }),
      prismaUnscoped.user.findUnique({
        where: { id: user.id },
        select: { email: true, emailVerified: true },
      }),
    ]);

    ownerEmail = owner?.email || user.email;
    ownerEmailVerified = Boolean(owner?.emailVerified);

    if (owned) {
      existing = {
        id: owned.id,
        slug: owned.slug,
        name: owned.name,
        legalName: owned.legalName,
        tagline: owned.tagline,
        description: owned.description,
        licenseNumber: owned.licenseNumber,
        ppbPremisesNumber: owned.ppbPremisesNumber,
        phone: owned.phone,
        whatsapp: owned.whatsapp,
        email: owned.email,
        city: owned.city,
        county: owned.county,
        latitude: owned.latitude,
        longitude: owned.longitude,
        status: owned.status,
        verificationNotes: owned.verificationNotes,
        rejectionReason: owned.rejectionReason,
      };

      verificationPharmacy = {
        id: owned.id,
        name: owned.name,
        legalName: owned.legalName,
        licenseNumber: owned.licenseNumber,
        ppbPremisesNumber: owned.ppbPremisesNumber,
        licenseDocumentUrl: owned.licenseDocumentUrl,
        kraPin: owned.kraPin,
        status: owned.status,
      };

      if (["draft", "needs_info"].includes(owned.status)) {
        verificationReadiness = await loadOwnerSubmissionReadiness(owned.id);
      }
    }
  }

  const kypCoreMissing = verificationReadiness
    ? verificationReadiness.missing.filter((item) => !PREMISES_CONTACT_ITEMS.has(item))
    : [];
  const requiresKyp = Boolean(
    existing &&
      verificationPharmacy &&
      ["draft", "needs_info"].includes(existing.status) &&
      kypCoreMissing.length > 0,
  );

  return (
    <div
      className={`${styles.onboardPage} min-h-screen overflow-x-hidden bg-[var(--background)] px-3 pb-12 pt-24 text-[var(--foreground)] transition-colors duration-300 sm:px-6 sm:pb-16 sm:pt-28 lg:pt-32`}
    >
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 sm:mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs sm:tracking-[0.2em]">
            Know Your Pharmacy onboarding
          </p>
          <h1
            className="mt-2 max-w-2xl text-[clamp(1.75rem,8vw,2.45rem)] font-bold leading-[1.05] tracking-[-0.025em] text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Verify the pharmacy before it joins Aether
          </h1>
          <p className="mt-3 max-w-2xl text-[13px] leading-6 text-[var(--muted)] sm:text-sm sm:leading-relaxed">
            Joining the network is a regulated identity check, not just a PPB-number form. We verify the applicant, licensed premises, responsible professional, legal business, evidence and exact location before platform approval.{" "}
            <Link href="/for-pharmacies" className="font-semibold text-[var(--brand)] underline-offset-2 hover:underline">
              How verification works
            </Link>
            {!user && (
              <>
                {" "}
                Already registered?{" "}
                <Link href="/login?next=/onboard" className="font-semibold text-[var(--brand)] underline-offset-2 hover:underline">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </header>

        <PharmacyPricing/>
        {existing && <Link href="/onboard/billing" className="mb-5 inline-block rounded-xl border border-[var(--border)] px-4 py-3 font-semibold text-[var(--brand)]">Pricing & billing · Pay verification fee →</Link>}

        {existing?.status === "needs_info" && <section role="status" className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5"><h2 className="font-semibold">Your reviewer needs a correction</h2><p className="mt-2 text-sm leading-6">{existing.verificationNotes || "Review your dossier and resubmit the missing evidence."}</p></section>}
        {requiresKyp && verificationPharmacy && verificationReadiness ? (
          <>
            <section className="mb-5 rounded-2xl border border-teal-200 bg-teal-50/80 p-4 shadow-sm dark:border-teal-300/20 dark:bg-teal-300/[0.06] sm:mb-6 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-300/15 dark:text-teal-100">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-200/70">Stage 2 · Know Your Pharmacy</p>
                  <h2 className="mt-1 text-sm font-semibold text-teal-950 dark:text-teal-50">Complete the regulatory identity dossier before premises setup</h2>
                  <p className="mt-1 text-xs leading-5 text-teal-900/75 dark:text-teal-100/70">
                    This is now part of the main onboarding path. The application cannot move to submission until the mandatory KYP evidence is complete.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {kypCoreMissing.slice(0, 6).map((item) => (
                      <span key={item} className="rounded-full border border-teal-200 bg-white px-2.5 py-1 text-[11px] font-medium text-teal-900 dark:border-teal-300/20 dark:bg-white/5 dark:text-teal-100">
                        {item}
                      </span>
                    ))}
                    {kypCoreMissing.length > 6 ? (
                      <span className="rounded-full border border-teal-200 bg-white px-2.5 py-1 text-[11px] font-medium text-teal-900 dark:border-teal-300/20 dark:bg-white/5 dark:text-teal-100">
                        +{kypCoreMissing.length - 6} more
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <VerificationDossierForm
              pharmacy={verificationPharmacy}
              profile={verificationReadiness.profile}
              ownerEmail={ownerEmail}
              ownerEmailVerified={ownerEmailVerified}
            />
          </>
        ) : (
          <>
            {existing && verificationReadiness ? (
              <section className={`mb-5 rounded-2xl border p-4 shadow-sm sm:mb-6 sm:p-5 ${verificationReadiness.ready ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-400/25 dark:bg-emerald-400/10" : "border-amber-200 bg-amber-50/85 dark:border-amber-400/30 dark:bg-amber-400/10"}`}>
                <div className="flex items-start gap-3">
                  <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${verificationReadiness.ready ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-300/15 dark:text-amber-100"}`}>
                    {verificationReadiness.ready ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className={`text-sm font-semibold ${verificationReadiness.ready ? "text-emerald-950 dark:text-emerald-100" : "text-amber-950 dark:text-amber-100"}`}>
                      {verificationReadiness.ready ? "KYP dossier and premises evidence complete" : "KYP complete — finish premises and contact verification"}
                    </h2>
                    <p className={`mt-1 text-xs leading-5 ${verificationReadiness.ready ? "text-emerald-900/75 dark:text-emerald-100/70" : "text-amber-900/75 dark:text-amber-100/75"}`}>
                      {verificationReadiness.ready
                        ? "Your evidence package is complete. Review the application and submit it to the network verification team."
                        : `${verificationReadiness.missing.length} premises/contact item${verificationReadiness.missing.length === 1 ? "" : "s"} still need attention before submission.`}
                    </p>
                    {!verificationReadiness.ready ? (
                      <p className="mt-2 text-[11px] leading-5 text-amber-800 dark:text-amber-100/65">
                        {verificationReadiness.missing.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            <OnboardWizard signedIn={Boolean(user)} existing={existing} />
          </>
        )}
      </div>
    </div>
  );
}
