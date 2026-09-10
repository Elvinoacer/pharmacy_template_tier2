import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { TenantBrandProvider } from "@/app/components/TenantBrand";
import { PortalPharmaciesProvider } from "@/app/components/portal/PortalPharmaciesContext";
import { getResolvedPharmacyOrNull } from "@/app/lib/services/pharmacy-settings";
import { platform } from "@/app/lib/data";
import styles from "./PortalAdaptiveSurface.module.css";
import responsiveStyles from "./PortalSurface.module.css";

// Portal is always request-time (session cookie + profile checks).
export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/portal");
  if (user.platformAdmin && !user.customerId) redirect("/platform");
  if (isStaff(user.role) && !user.customerId) redirect("/admin");

  if (user.role === "caregiver" && !user.customerId) {
    redirect("/caregiver");
  }

  if (!user.customerId && user.role === "customer") {
    redirect("/login");
  }

  const [resolved, linked] = await Promise.all([
    getResolvedPharmacyOrNull().catch(() => null),
    user.customerId
      ? prismaUnscoped.customerPharmacy
          .findMany({
            where: { customerId: user.customerId },
            include: {
              pharmacy: {
                select: { id: true, slug: true, name: true, city: true, logoUrl: true, status: true, listed: true },
              },
            },
          })
          .catch(() => [] as never[])
      : Promise.resolve([] as never[]),
  ]);

  const pharmacies = (linked as unknown as Array<{
    pharmacy: {
      id: string; slug: string; name: string; city: string | null;
      logoUrl: string | null; status: string; listed: boolean;
    };
  }>)
    .map((row) => row.pharmacy)
    .filter((p) => p.status === "active" && p.listed)
    .map(({ id, slug, name, city, logoUrl }) => ({ id, slug, name, city, logoUrl }));

  return (
    <TenantBrandProvider
      value={{
        name: resolved?.name || platform.name,
        network: platform.legalName,
        slug: resolved?.slug || null,
      }}
    >
      <PortalPharmaciesProvider pharmacies={pharmacies}>
        <div className={`${styles.surface} ${responsiveStyles.surface}`}>{children}</div>
      </PortalPharmaciesProvider>
    </TenantBrandProvider>
  );
}
