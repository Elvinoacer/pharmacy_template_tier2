import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { resolvePostLoginPath } from "@/app/lib/session-claim";
import CompleteProfileForm from "@/app/components/portal/CompleteProfileForm";
import { logoutAction } from "@/app/actions/auth";

export const metadata = { title: "Complete your profile" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login?next=/portal");
  const profile = await prisma.customerProfile.findUnique({ where: { id: user.customerId }, select: { fullName: true, phone: true, onboardingCompletedAt: true } });
  if (!profile) redirect("/login");
  const destination = resolvePostLoginPath(user, next?.split(/[?#]/)[0] === "/portal/onboarding" ? null : next);
  if (profile.onboardingCompletedAt) redirect(destination);

  return <main className="flex min-h-dvh items-center justify-center bg-[#f4f8f5] px-4 py-10 text-[#0c1a14]">
    <div className="w-full max-w-lg">
      <Link href="/" className="mb-6 inline-flex min-h-11 items-center text-sm font-semibold text-[#0d6e5a] hover:underline">← Back to marketplace</Link>
      <section className="rounded-3xl border border-[#cfe4da] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-[#0d6e5a]">Welcome to Aether</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Let’s get you started</h1>
        <p className="mt-3 text-base leading-7 text-[#5a6b62]">Confirm your name, then continue to your care. You can add an address and other details later in your profile.</p>
        <CompleteProfileForm fullName={profile.fullName} phone={profile.phone} next={destination} />
      </section>
      <form action={logoutAction} className="mt-5 text-center"><button className="min-h-11 text-sm text-[#5a6b62] underline">Use a different account</button></form>
    </div>
  </main>;
}
