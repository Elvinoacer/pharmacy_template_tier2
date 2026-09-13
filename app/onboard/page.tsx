import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { withPharmacy } from "@/app/lib/tenant-context";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { loadOwnerSubmissionReadiness } from "@/app/lib/services/pharmacy-verification";
import OnboardWizard from "@/app/components/onboard/OnboardWizard";
import VerificationDossierForm from "@/app/components/onboard/VerificationDossierForm";
import JoinValuePanel from "@/app/components/onboard/JoinValuePanel";
import styles from "@/app/components/onboard/OnboardSurface.module.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Join as a pharmacy",
  description: "A digital storefront, organised requests, and patients who come back — from KES 500 a month after you go live.",
};

const PREMISES_CONTACT_ITEMS = new Set(["pharmacy city", "public phone number", "precise premises map pin"]);

export default async function OnboardPage() {
  const user = await getSessionUser().catch(() => null);
  let existing = null;
  let verificationFeePaid = false;
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
      const invoice = await withPharmacy(owned.id, () => prismaUnscoped.invoice.findUnique({
        where: { number: `KYP-${owned.id}` },
        select: { status: true },
      }));
      verificationFeePaid = invoice?.status === "paid";
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
    existing && verificationPharmacy && ["draft", "needs_info"].includes(existing.status) && kypCoreMissing.length > 0,
  );
  const showPitch = !existing;

  return (
    <div className={showPitch ? styles.frame : styles.narrow}>
      {showPitch ? (
        <div className={styles.split}>
          <JoinValuePanel />
          <div id="pharmacy-application" className={styles.work}>
            <OnboardWizard signedIn={Boolean(user)} existing={existing} verificationFeePaid={verificationFeePaid} />
          </div>
        </div>
      ) : (
        <div id="pharmacy-application" className={styles.work}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={styles.kicker}>{existing?.name}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Continue your application</p>
            </div>
            <Link href="/onboard/billing" className={styles.quietLink}>
              Fees <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          {existing?.status === "needs_info" ? (
            <section role="status" className={`${styles.notice} ${styles.noticeAmber}`}>
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
              <div>
                <h2>A correction is needed</h2>
                <p>{existing.verificationNotes || "Review the dossier and resubmit the missing evidence."}</p>
              </div>
            </section>
          ) : null}

          {requiresKyp && verificationPharmacy && verificationReadiness ? (
            <VerificationDossierForm
              pharmacy={verificationPharmacy}
              profile={verificationReadiness.profile}
              ownerEmail={ownerEmail}
              ownerEmailVerified={ownerEmailVerified}
              embedded
            />
          ) : (
            <>
              {verificationReadiness ? (
                <section
                  className={`${styles.notice} ${verificationReadiness.ready ? styles.noticeOk : styles.noticeWarn}`}
                >
                  {verificationReadiness.ready ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden />
                  ) : (
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  )}
                  <div>
                    <h2>{verificationReadiness.ready ? "Ready to submit" : "Almost there"}</h2>
                    {!verificationReadiness.ready ? (
                      <p>{verificationReadiness.missing.join(" · ")}</p>
                    ) : null}
                  </div>
                </section>
              ) : null}
              <OnboardWizard signedIn={Boolean(user)} existing={existing} verificationFeePaid={verificationFeePaid} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
