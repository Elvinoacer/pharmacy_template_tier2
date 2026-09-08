import Link from "next/link";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import OnboardWizard from "@/app/components/onboard/OnboardWizard";
import styles from "@/app/components/onboard/OnboardWizard.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pharmacy onboarding" };

export default async function OnboardPage() {
  const user = await getSessionUser().catch(() => null);
  let existing = null;
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
            Takes about 8 minutes. Drafts stay private until you submit them for review.{" "}
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

        <OnboardWizard signedIn={Boolean(user)} existing={existing} />
      </div>
    </div>
  );
}
