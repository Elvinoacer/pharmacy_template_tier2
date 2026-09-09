import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { resolvePostLoginPath } from "@/app/lib/session-claim";
import CompleteProfileForm from "@/app/components/portal/CompleteProfileForm";
import { logoutAction } from "@/app/actions/auth";
import styles from "./Onboarding.module.css";

export const metadata = { title: "Complete your profile" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login?next=/portal");

  const profile = await prisma.customerProfile.findUnique({
    where: { id: user.customerId },
    select: { fullName: true, phone: true, onboardingCompletedAt: true },
  });
  if (!profile) redirect("/login");

  const destination = resolvePostLoginPath(
    user,
    next?.split(/[?#]/)[0] === "/portal/onboarding" ? null : next
  );
  if (profile.onboardingCompletedAt) redirect(destination);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.backLink}>
          <span aria-hidden="true">←</span>
          <span>Back to marketplace</span>
        </Link>

        <section className={styles.card} aria-labelledby="onboarding-title">
          <p className={styles.kicker}>Welcome to Aether</p>
          <h1 id="onboarding-title" className={styles.title}>
            Let&apos;s get you started
          </h1>
          <p className={styles.description}>
            Confirm your name, then continue to your care. You can add an address and other details later in your profile.
          </p>

          <CompleteProfileForm
            fullName={profile.fullName}
            phone={profile.phone}
            next={destination}
          />
        </section>

        <form action={logoutAction} className={styles.accountForm}>
          <button className={styles.accountButton}>Use a different account</button>
        </form>
      </div>
    </main>
  );
}
