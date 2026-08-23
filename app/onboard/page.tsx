import Link from "next/link";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import OnboardWizard from "@/app/components/onboard/OnboardWizard";

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
    <div className="mesh-bg min-h-screen px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0d6e5a]">Network onboarding</p>
        <h1
          className="mt-2 text-3xl font-bold text-[#0c1a14] sm:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Open your pharmacy on Aether
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#5a6b62]">
          Takes about 8 minutes. Drafts are private.{" "}
          <Link href="/for-pharmacies" className="font-semibold text-[#0d6e5a] hover:underline">
            How verification works
          </Link>
          {!user && (
            <>
              {" "}
              Already registered?{" "}
              <Link href="/login?next=/onboard" className="font-semibold text-[#0d6e5a] hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
        <div className="mt-8">
          <OnboardWizard signedIn={Boolean(user)} existing={existing} />
        </div>
      </div>
    </div>
  );
}
