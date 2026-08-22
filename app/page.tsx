import { listMarketplacePharmacies } from "@/app/lib/tenant";
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

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const city = (sp.city || "").trim();
  const pharmacies = await listMarketplacePharmacies({
    q: q || undefined,
    city: city || undefined,
  });

  return (
    <div className="landing-root min-h-screen bg-[#070b10] text-[#0f172a] pb-16 lg:pb-0">
      {/* 1. CINEMATIC HERO */}
      <TravelLabHero
        pharmacyCount={pharmacies.length || 12}
        initialQuery={q}
      />

      {/* 2. "THIS IS OUR STORY" STATEMENT & 3-CARD VISUAL STORY */}
      <TravelLabStory />

      {/* 3. IMPACT & SCALE - 5-COLUMN METRIC COUNTERS */}
      <TravelLabMetrics />

      {/* 4. HORIZONTAL INTERACTIVE MILESTONES & TIMELINE */}
      <TravelLabTimeline />

      {/* 5. "OUR NETWORK & SERVICES" - DIRECTORY + 4 CARE TOOLS */}
      <TravelLabNetwork
        pharmacies={pharmacies}
        initialCity={city}
        initialQuery={q}
      />

      {/* 6. STATUTORY & INSTITUTIONAL PARTNERS */}
      <TravelLabPartners />

      {/* 7. CLINICAL & EXECUTIVE LEADERSHIP TEAM */}
      <TravelLabTeam />

      {/* 8. PARALLAX CLOSING SECTION & OPERATIONAL HUBS */}
      <TravelLabContact />

      {/* 9. MOBILE FLOATING ACTION DOCK */}
      <LandingMobileActionBar />
    </div>
  );
}
