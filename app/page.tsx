import { getMarketplaceFeaturedPharmacies } from "@/app/lib/services/pharmacy-directory";
import { platform } from "@/app/lib/data";
import CarePathways from "./components/landing/CarePathways";
import TravelLabHero from "./components/landing/TravelLabHero";
import TravelLabNetwork from "./components/landing/TravelLabNetwork";
import LandingCareDemo from "./components/landing/LandingCareDemo";
import TravelLabContact from "./components/landing/TravelLabContact";
import LandingMobilePolish from "./components/landing/LandingMobilePolish";
import HeroFeatureCardMobilePolish from "./components/landing/HeroFeatureCardMobilePolish";
import HeroMetricsMobilePolish from "./components/landing/HeroMetricsMobilePolish";
import CareDemoMobilePolish from "./components/landing/CareDemoMobilePolish";
import LandingMobileDensityPolish from "./components/landing/LandingMobileDensityPolish";
import CareNearYouInputPolish from "./components/landing/CareNearYouInputPolish";
import HeroSearchInputPolish from "./components/landing/HeroSearchInputPolish";
import styles from "./components/landing/LandingTheme.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${platform.name} — ${platform.tagline}`,
  description: platform.description,
};

export default async function MarketplacePage() {
  const featuredPharmacies = await getMarketplaceFeaturedPharmacies();

  return (
    <div className="landing-root min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <LandingMobilePolish />
      <HeroFeatureCardMobilePolish />
      <HeroMetricsMobilePolish />
      <CareDemoMobilePolish />
      <CareNearYouInputPolish />
      <HeroSearchInputPolish />
      <LandingMobileDensityPolish />
      <TravelLabHero pharmacyCount={featuredPharmacies.length || 0} initialQuery="" />
      <div className={`${styles.adaptiveSection} ${styles.carePathwaysSection}`}>
        <CarePathways />
      </div>
      <div className={`${styles.adaptiveSection} ${styles.networkSection}`}>
        <TravelLabNetwork pharmacies={featuredPharmacies} />
      </div>
      <div className={styles.adaptiveSection}>
        <LandingCareDemo />
      </div>
      <div className={`${styles.adaptiveSection} ${styles.contactSection}`}>
        <TravelLabContact />
      </div>
    </div>
  );
}
