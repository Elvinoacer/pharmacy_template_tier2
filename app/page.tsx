import { getMarketplaceFeaturedPharmacies } from "@/app/lib/services/pharmacy-directory";
import { platform } from "@/app/lib/data";
import TravelLabHero from "./components/landing/TravelLabHero";
import TravelLabNetwork from "./components/landing/TravelLabNetwork";
import LandingCareDemo from "./components/landing/LandingCareDemo";
import TravelLabContact from "./components/landing/TravelLabContact";
import LandingMobileActionBar from "./components/landing/LandingMobileActionBar";
import LandingMobilePolish from "./components/landing/LandingMobilePolish";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${platform.name} — ${platform.tagline}`,
  description: platform.description,
};

export default async function MarketplacePage() {
  const featuredPharmacies = await getMarketplaceFeaturedPharmacies();

  return (
    <div className="landing-root min-h-screen bg-[#030907] text-white pb-16 lg:pb-0">
      <LandingMobilePolish />
      <TravelLabHero pharmacyCount={featuredPharmacies.length || 0} initialQuery="" />
      <TravelLabNetwork pharmacies={featuredPharmacies} />
      <LandingCareDemo />
      <TravelLabContact />
      <LandingMobileActionBar />
    </div>
  );
}
