import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { loadLatestVerificationProfile } from "@/app/lib/services/pharmacy-verification";
import VerificationDossierForm from "@/app/components/onboard/VerificationDossierForm";
import styles from "@/app/components/onboard/OnboardSurface.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify your pharmacy" };

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
      ? { id: requestedId, ownerUserId: user.id }
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
    <div className={styles.narrow}>
      <Link href="/onboard" className={styles.quietLink}>
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Application
      </Link>
      <p className={`${styles.kicker} mt-5`}>{pharmacy.name}</p>
      <div className="mt-4">
        <VerificationDossierForm
          pharmacy={pharmacy}
          profile={profileResult?.profile ?? null}
          ownerEmail={owner?.email || user.email}
          ownerEmailVerified={Boolean(owner?.emailVerified)}
        />
      </div>
    </div>
  );
}
