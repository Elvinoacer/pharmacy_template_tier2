import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { loadLatestVerificationProfile } from "@/app/lib/services/pharmacy-verification";
import VerificationDossierForm from "@/app/components/onboard/VerificationDossierForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pharmacy verification dossier" };

export default async function PharmacyVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ pharmacyId?: string }>;
}) {
  const user = await getSessionUser().catch(() => null);
  if (!user) redirect("/login?next=/onboard/verification");

  const params = await searchParams;
  const requestedId = (params.pharmacyId || "").trim();
  const pharmacy = await prismaUnscoped.pharmacy.findFirst({
    where: requestedId
      ? { id: requestedId, OR: [{ ownerUserId: user.id }, { ownerUserId: user.platformAdmin ? undefined : user.id }] }
      : { ownerUserId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      legalName: true,
      licenseNumber: true,
      ppbPremisesNumber: true,
      licenseDocumentUrl: true,
      kraPin: true,
      status: true,
    },
  });

  if (!pharmacy) redirect("/onboard");

  const [profileResult, owner] = await Promise.all([
    loadLatestVerificationProfile(pharmacy.id),
    prismaUnscoped.user.findUnique({
      where: { id: user.id },
      select: { email: true, emailVerified: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-[var(--background)] px-3 pb-14 pt-24 text-[var(--foreground)] transition-colors sm:px-6 sm:pt-28 lg:pt-32">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/onboard" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg text-xs font-semibold text-[var(--brand)] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to pharmacy application
        </Link>

        <header className="mb-6 mt-3 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-300/10 dark:text-teal-200">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)]">Regulatory identity</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">Verify {pharmacy.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Supply the evidence the network team needs to independently match this pharmacy to PPB premises records, the responsible professional and the legal business. Submission stays blocked until the mandatory dossier is complete.
              </p>
              <p className="mt-3 text-xs font-medium text-[var(--muted)]">Application status: {pharmacy.status.replace(/_/g, " ")}</p>
            </div>
          </div>
        </header>

        <VerificationDossierForm
          pharmacy={pharmacy}
          profile={profileResult?.profile ?? null}
          ownerEmail={owner?.email || user.email}
          ownerEmailVerified={Boolean(owner?.emailVerified)}
        />
      </div>
    </main>
  );
}
