import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { TenantBrandProvider } from "@/app/components/TenantBrand";
import { getResolvedPharmacyOrNull } from "@/app/lib/services/pharmacy-settings";
import { platform } from "@/app/lib/data";

// Portal is always request-time (session cookie + profile checks).
export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/portal");
  if (isStaff(user.role) && !user.customerId) redirect("/admin");

  if (user.role === "caregiver" && !user.customerId) {
    redirect("/caregiver");
  }

  if (!user.customerId && user.role === "customer") {
    redirect("/login");
  }

  const resolved = await getResolvedPharmacyOrNull().catch(() => null);

  return (
    <TenantBrandProvider
      value={{
        name: resolved?.name || platform.name,
        network: platform.legalName,
        slug: resolved?.slug || null,
      }}
    >
      {children}
    </TenantBrandProvider>
  );
}
