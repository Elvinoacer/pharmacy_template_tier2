import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/app/lib/auth";

// Portal is always request-time (session cookie + profile checks).
export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/portal");
  if (isStaff(user.role) && !user.customerId) redirect("/admin");

  // Caregivers (role=caregiver with no patient profile of their own) must NOT
  // access /portal routes — they only get /caregiver. The portal exposes
  // customer profile editing, loyalty, CRM, and messaging which the caregiver
  // is explicitly forbidden from seeing. Send them to /caregiver instead.
  if (user.role === "caregiver" && !user.customerId) {
    redirect("/caregiver");
  }

  if (!user.customerId && user.role === "customer") {
    // Edge case: customer without profile
    redirect("/login");
  }

  // Onboarding guard lives in proxy.ts + each page calls `requireOnboarded()`
  // (see app/lib/require-onboarded.ts). The layout itself doesn't redirect
  // because it can't reliably tell which child route is rendering.

  return <>{children}</>;
}
