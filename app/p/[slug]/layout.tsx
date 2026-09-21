import { notFound } from "next/navigation";
import { publicPharmacyProfile } from "@/app/lib/services/public-pharmacy-profile";
import { TenantBrandProvider } from "@/app/components/TenantBrand";
import ThemeToggle from "@/app/components/ThemeProvider";
import styles from "./Storefront.module.css";

export default async function PharmacyLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publicPharmacyProfile(slug);
  if (!data) notFound();

  return (
    <TenantBrandProvider value={{ name: data.profile.name, slug: data.profile.slug, network: "Afyvia" }}>
      <div className={`${styles.themeScope} afyvia-artwork-surface min-h-screen`}>
        <div className={styles.themeControl} aria-label="Storefront theme control">
          <ThemeToggle compact />
        </div>
        {children}
      </div>
    </TenantBrandProvider>
  );
}
