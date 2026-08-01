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
  return <>{children}</>;
}
