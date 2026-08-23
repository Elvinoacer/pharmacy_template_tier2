import { getMarketplaceFeaturedPharmacies } from "@/app/lib/services/pharmacy-directory";
import { platform } from "@/app/lib/data";
import TravelLabHero from "./components/landing/TravelLabHero";
import TravelLabStory from "./components/landing/TravelLabStory";
import TravelLabMetrics from "./components/landing/TravelLabMetrics";
import TravelLabTimeline from "./components/landing/TravelLabTimeline";
import TravelLabNetwork from "./components/landing/TravelLabNetwork";
import TravelLabPartners from "./components/landing/TravelLabPartners";
import TravelLabTeam from "./components/landing/TravelLabTeam";
import TravelLabContact from "./components/landing/TravelLabContact";
import LandingMobileActionBar from "./components/landing/LandingMobileActionBar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${platform.name} — ${platform.tagline}`,
  description: platform.description,
};

export default async function MarketplacePage() {
  const featuredPharmacies = await getMarketplaceFeaturedPharmacies();

  return (
    <div className="landing-root min-h-screen bg-[#070b10] text-[#0f172a] pb-16 lg:pb-0">
      <TravelLabHero pharmacyCount={featuredPharmacies.length || 0} initialQuery="" />
      <TravelLabStory />
      <TravelLabMetrics />
      <TravelLabTimeline />
      <TravelLabNetwork pharmacies={featuredPharmacies} />
      <TravelLabPartners />
      <TravelLabTeam />
      <TravelLabContact />
      <LandingMobileActionBar />
    </div>
  );
}
