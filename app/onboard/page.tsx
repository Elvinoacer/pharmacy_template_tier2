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
      className={`${styles.onboardPage} min-h-screen overflow-x-hidden bg-[var(--background)] px-4 pb-16 pt-24 text-[var(--foreground)] transition-colors duration-300 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8 lg:pb-24 lg:pt-32 xl:pt-36`}
    >
      <div className="mx-auto w-full max-w-7xl">
        <header className="max-w-5xl pb-10 sm:pb-14 lg:pb-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--brand)] sm:text-xs sm:tracking-[0.24em]">
            Know Your Pharmacy onboarding
          </p>
          <h1
            className="mt-4 max-w-4xl text-[clamp(2.45rem,6vw,5rem)] font-bold leading-[0.98] tracking-[-0.045em] text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Verify the pharmacy before it joins Aether
          </h1>
          <p className="mt-6 max-w-3xl text-[15px] leading-7 text-[var(--muted)] sm:text-base sm:leading-8 lg:text-lg">
            Aether verifies the applicant, licensed premises, responsible professional, legal business and exact location before a pharmacy can join the network.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/for-pharmacies"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line-2)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold text-[var(--brand)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand)] sm:w-auto"
            >
              How verification works
            </Link>
            {!user && (
              <Link
                href="/login?next=/onboard"
                className="inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--card-elev)] hover:text-[var(--foreground)] sm:w-auto"
              >
                Already registered? Sign in
              </Link>
            )}
          </div>
        </header>

        <PharmacyPricing />

        <div id="pharmacy-application" className="mx-auto mt-12 w-full max-w-3xl scroll-mt-28 sm:mt-16 lg:mt-20">
          {existing && (
            <Link
              href="/onboard/billing"
              className="mb-6 inline-flex min-h-11 items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold text-[var(--brand)] shadow-sm transition hover:-translate-y-0.5"
            >
              Pricing & billing · Pay verification fee →
            </Link>
          )}

          {existing?.status === "needs_info" && (
            <section role="status" className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 sm:p-6">
              <h2 className="font-semibold">Your reviewer needs a correction</h2>
              <p className="mt-2 text-sm leading-6">{existing.verificationNotes || "Review your dossier and resubmit the missing evidence."}</p>
            </section>
          )}

          {requiresKyp && verificationPharmacy && verificationReadiness ? (
            <>
              <section className="mb-6 rounded-2xl border border-teal-200 bg-teal-50/80 p-5 shadow-sm dark:border-teal-300/20 dark:bg-teal-300/[0.06] sm:rounded-3xl sm:p-6">
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-300/15 dark:text-teal-100">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200/70">Stage 2 · Know Your Pharmacy</p>
                    <h2 className="mt-2 text-base font-semibold text-teal-950 dark:text-teal-50">Complete the regulatory identity dossier before premises setup</h2>
                    <p className="mt-2 text-sm leading-6 text-teal-900/75 dark:text-teal-100/70">
                      The application cannot move to submission until the mandatory KYP evidence is complete.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {kypCoreMissing.slice(0, 6).map((item) => (
                        <span key={item} className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-[11px] font-medium text-teal-900 dark:border-teal-300/20 dark:bg-white/5 dark:text-teal-100">
                          {item}
                        </span>
                      ))}
                      {kypCoreMissing.length > 6 ? (
                        <span className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-[11px] font-medium text-teal-900 dark:border-teal-300/20 dark:bg-white/5 dark:text-teal-100">
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
                <section className={`mb-6 rounded-2xl border p-5 shadow-sm sm:rounded-3xl sm:p-6 ${verificationReadiness.ready ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-400/25 dark:bg-emerald-400/10" : "border-amber-200 bg-amber-50/85 dark:border-amber-400/30 dark:bg-amber-400/10"}`}>
                  <div className="flex items-start gap-4">
                    <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${verificationReadiness.ready ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-300/15 dark:text-amber-100"}`}>
                      {verificationReadiness.ready ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className={`text-base font-semibold ${verificationReadiness.ready ? "text-emerald-950 dark:text-emerald-100" : "text-amber-950 dark:text-amber-100"}`}>
                        {verificationReadiness.ready ? "KYP dossier and premises evidence complete" : "KYP complete — finish premises and contact verification"}
                      </h2>
                      <p className={`mt-2 text-sm leading-6 ${verificationReadiness.ready ? "text-emerald-900/75 dark:text-emerald-100/70" : "text-amber-900/75 dark:text-amber-100/75"}`}>
                        {verificationReadiness.ready
                          ? "Your evidence package is complete. Review the application and submit it to the network verification team."
                          : `${verificationReadiness.missing.length} premises/contact item${verificationReadiness.missing.length === 1 ? "" : "s"} still need attention before submission.`}
                      </p>
                      {!verificationReadiness.ready ? (
                        <p className="mt-3 text-xs leading-5 text-amber-800 dark:text-amber-100/65">
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
    </div>
  );
}
