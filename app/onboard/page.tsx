import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { loadOwnerSubmissionReadiness } from "@/app/lib/services/pharmacy-verification";
import OnboardWizard from "@/app/components/onboard/OnboardWizard";
import styles from "@/app/components/onboard/OnboardWizard.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pharmacy onboarding" };

export default async function OnboardPage() {
  const user = await getSessionUser().catch(() => null);
  let existing = null;
  let verificationReadiness: Awaited<ReturnType<typeof loadOwnerSubmissionReadiness>> | null = null;

  if (user) {
    const owned = await prismaUnscoped.pharmacy.findFirst({
      where: { ownerUserId: user.id },
      orderBy: { createdAt: "desc" },
    });
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
      };
      if (["draft", "needs_info"].includes(owned.status)) {
        verificationReadiness = await loadOwnerSubmissionReadiness(owned.id);
      }
    }
  }

  return (
    <div
      className={`${styles.onboardPage} min-h-screen overflow-x-hidden bg-[var(--background)] px-3 pb-12 pt-24 text-[var(--foreground)] transition-colors duration-300 sm:px-6 sm:pb-16 sm:pt-28 lg:pt-32`}
    >
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6 sm:mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs sm:tracking-[0.2em]">
            Network onboarding
          </p>
          <h1
            className="mt-2 max-w-xl text-[clamp(1.75rem,8vw,2.45rem)] font-bold leading-[1.05] tracking-[-0.025em] text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Open your pharmacy on Aether
          </h1>
          <p className="mt-3 max-w-xl text-[13px] leading-6 text-[var(--muted)] sm:text-sm sm:leading-relaxed">
            Save your application as you go. Before submission, we require regulatory evidence so the network team can independently verify the pharmacy, its PPB premises identity and the responsible professional.{" "}
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

        {existing && verificationReadiness ? (
          <section className={`mb-5 rounded-2xl border p-4 shadow-sm sm:mb-6 sm:p-5 ${verificationReadiness.ready ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-400/25 dark:bg-emerald-400/10" : "border-amber-200 bg-amber-50/85 dark:border-amber-400/30 dark:bg-amber-400/10"}`}>
            <div className="flex items-start gap-3">
              <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${verificationReadiness.ready ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-300/15 dark:text-amber-100"}`}>
                {verificationReadiness.ready ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className={`text-sm font-semibold ${verificationReadiness.ready ? "text-emerald-950 dark:text-emerald-100" : "text-amber-950 dark:text-amber-100"}`}>
                  {verificationReadiness.ready ? "Verification dossier complete" : "Regulatory verification required before submission"}
                </h2>
                <p className={`mt-1 text-xs leading-5 ${verificationReadiness.ready ? "text-emerald-900/75 dark:text-emerald-100/70" : "text-amber-900/75 dark:text-amber-100/75"}`}>
                  {verificationReadiness.ready
                    ? "Your evidence package is complete. You can review the application below and submit it to the network team."
                    : `${verificationReadiness.missing.length} required verification item${verificationReadiness.missing.length === 1 ? "" : "s"} still need attention.`}
                </p>
                {!verificationReadiness.ready ? (
                  <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-amber-800 dark:text-amber-100/65">
                    {verificationReadiness.missing.slice(0, 4).join(" · ")}{verificationReadiness.missing.length > 4 ? " · …" : ""}
                  </p>
                ) : null}
                <Link
                  href={`/onboard/verification?pharmacyId=${existing.id}`}
                  className={`mt-3 inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-xs font-semibold transition ${verificationReadiness.ready ? "border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50 dark:border-emerald-300/30 dark:bg-white/5 dark:text-emerald-100 dark:hover:bg-white/10" : "bg-amber-900 text-white hover:bg-amber-950 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"}`}
                >
                  {verificationReadiness.ready ? "Review verification dossier" : "Complete verification dossier"}
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <OnboardWizard signedIn={Boolean(user)} existing={existing} />
      </div>
    </div>
  );
}
