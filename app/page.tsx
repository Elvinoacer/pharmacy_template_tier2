import { getMarketplaceFeaturedPharmacies } from "@/app/lib/services/pharmacy-directory";
import { platform } from "@/app/lib/data";
import CarePathways from "./components/landing/CarePathways";
import TravelLabHero from "./components/landing/TravelLabHero";
import TravelLabNetwork from "./components/landing/TravelLabNetwork";
import LandingCareDemo from "./components/landing/LandingCareDemo";
import TravelLabContact from "./components/landing/TravelLabContact";
import LandingMobileActionBar from "./components/landing/LandingMobileActionBar";
import LandingMobilePolish from "./components/landing/LandingMobilePolish";
import HeroFeatureCardMobilePolish from "./components/landing/HeroFeatureCardMobilePolish";
import HeroMetricsMobilePolish from "./components/landing/HeroMetricsMobilePolish";
import CareNearYouInputPolish from "./components/landing/CareNearYouInputPolish";
import HeroSearchInputPolish from "./components/landing/HeroSearchInputPolish";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${platform.name} — ${platform.tagline}`,
  description: platform.description,
};

export default async function MarketplacePage() {
  const featuredPharmacies = await getMarketplaceFeaturedPharmacies();

  return (
    <div className="landing-root min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-16 lg:pb-0">
      <LandingMobilePolish />
      <HeroFeatureCardMobilePolish />
      <HeroMetricsMobilePolish />
      <CareNearYouInputPolish />
      <HeroSearchInputPolish />
      <TravelLabHero pharmacyCount={featuredPharmacies.length || 0} initialQuery="" />
      <CarePathways />
      <TravelLabNetwork pharmacies={featuredPharmacies} />
      <LandingCareDemo />
      <TravelLabContact />
      <LandingMobileActionBar />
    </div>
  );
}
