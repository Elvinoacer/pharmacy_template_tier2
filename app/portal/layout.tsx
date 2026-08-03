import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/app/lib/auth";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/portal");
  if (isStaff(user.role) && !user.customerId) redirect("/admin");
  if (!user.customerId && user.role === "customer") {
    // Edge case: customer without profile
    redirect("/login");
  }

  // Onboarding guard lives in proxy.ts + each page calls `requireOnboarded()`
  // (see app/lib/require-onboarded.ts). The layout itself doesn't redirect
  // because it can't reliably tell which child route is rendering.

  return <>{children}</>;
}
