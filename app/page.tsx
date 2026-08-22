import { listMarketplacePharmacies } from "@/app/lib/tenant";
import { platform } from "@/app/lib/data";
import LandingHeroInteractive from "./components/landing/LandingHeroInteractive";
import LandingQuickCareDeck from "./components/landing/LandingQuickCareDeck";
import LandingDirectorySection from "./components/landing/LandingDirectorySection";
import LandingBentoGrid from "./components/landing/LandingBentoGrid";
import LandingOtcSpotlight from "./components/landing/LandingOtcSpotlight";
import LandingJourneyTabs from "./components/landing/LandingJourneyTabs";
import LandingHealthPillars from "./components/landing/LandingHealthPillars";
import LandingTrustMetrics from "./components/landing/LandingTrustMetrics";
import LandingFaqSection from "./components/landing/LandingFaqSection";
import LandingCtaBanner from "./components/landing/LandingCtaBanner";
import LandingMobileActionBar from "./components/landing/LandingMobileActionBar";
import { PublicTestimonials } from "./components/PublicTestimonials";

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
    <div className="landing-root min-h-screen bg-[#f4f7f4] text-[#0c1a14] pb-16 lg:pb-0">
      {/* ───────── 1. HERO WITH INTERACTIVE SIMULATOR ───────── */}
      <LandingHeroInteractive
        platformPromise={platform.promise}
        platformDescription={platform.description}
        initialQuery={q}
        pharmacyCount={pharmacies.length || 12}
      />

      {/* ───────── 2. 60-SECOND QUICK CARE COMMAND DECK ───────── */}
      <LandingQuickCareDeck />

      {/* ───────── 3. INTERACTIVE NETWORK EXPLORER & DIRECTORY ───────── */}
      <LandingDirectorySection
        pharmacies={pharmacies}
        initialCity={city}
        initialQuery={q}
      />

      {/* ───────── 4. WHY AETHER — HEALTHCARE BENTO GRID ───────── */}
      <LandingBentoGrid />

      {/* ───────── 5. OTC HEALTHCARE ESSENTIALS SPOTLIGHT ───────── */}
      <LandingOtcSpotlight />

      {/* ───────── 6. INTERACTIVE JOURNEY — TWO DOORS, ONE NETWORK ───────── */}
      <LandingJourneyTabs />

      {/* ───────── 7. CLINICAL PILLARS & EVIDENCE-BASED GUIDANCE ───────── */}
      <LandingHealthPillars />

      {/* ───────── 8. TRUST METRICS, CLINICAL TEAM & COMMUNITY VOICES ───────── */}
      <LandingTrustMetrics />

      {/* ───────── 9. LIVE DATABASE TESTIMONIALS (IF ANY) ───────── */}
      <PublicTestimonials limit={6} />

      {/* ───────── 10. INTERACTIVE CATEGORIZED FAQ ACCORDION ───────── */}
      <LandingFaqSection />

      {/* ───────── 11. CLOSING DUAL-AUDIENCE IMMERSIVE CTA BANNER ───────── */}
      <LandingCtaBanner />

      {/* ───────── 12. MOBILE BOTTOM QUICK ACTION BAR ───────── */}
      <LandingMobileActionBar />
    </div>
  );
}
