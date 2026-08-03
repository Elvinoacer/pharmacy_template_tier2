import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

/**
 * Server-side helper: redirect to /portal/onboarding if the customer hasn't
 * completed onboarding. Called at the top of every portal page (except
 * /portal/onboarding itself, which calls completeOnboardingAction on submit).
 *
 * Why per-page instead of layout? Layouts can't read the current URL pathname
 * reliably, so they can't tell `/portal/onboarding` from `/portal/refills`.
 * Per-page check is the cleanest pattern in Next.js 16.
 */
export async function requireOnboarded(): Promise<void> {
  const user = await getSessionUser();
  if (!user?.customerId) return; // layout will redirect to /login.

  const profile = await prisma.customerProfile.findUnique({
    where: { id: user.customerId },
    select: { onboardingCompletedAt: true },
  });

  if (!profile?.onboardingCompletedAt) {
    redirect("/portal/onboarding");
  }
}
