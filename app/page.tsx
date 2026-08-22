import { listMarketplacePharmacies } from "@/app/lib/tenant";
import { platform } from "@/app/lib/data";
import LandingHeroInteractive from "./components/landing/LandingHeroInteractive";
import LandingQuickCareDeck from "./components/landing/LandingQuickCareDeck";
import LandingDirectorySection from "./components/landing/LandingDirectorySection";
import LandingBentoGrid from "./components/landing/LandingBentoGrid";
import LandingOtcSpotlight from "./components/landing/LandingOtcSpotlight";
import LandingTrustMetrics from "./components/landing/LandingTrustMetrics";
import LandingFaqSection from "./components/landing/LandingFaqSection";
import LandingCtaBanner from "./components/landing/LandingCtaBanner";
import LandingMobileActionBar from "./components/landing/LandingMobileActionBar";
import { PublicTestimonials } from "./components/PublicTestimonials";
import LandingFeaturesShowcase from "./components/landing/LandingFeaturesShowcase";
import LandingStatsSection from "./components/landing/LandingStatsSection";

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
    <div className="landing-root min-h-screen bg-white text-[#0f172a]">
      {/* ───────── 1. STUNNING VISUAL HERO ───────── */}
      <LandingHeroInteractive
        platformPromise={platform.promise}
        platformDescription={platform.description}
        initialQuery={q}
        pharmacyCount={pharmacies.length || 12}
      />

      {/* ───────── 2. TRUST BADGES STRIP ───────── */}
      <LandingStatsSection />

      {/* ───────── 3. QUICK CARE SERVICES ───────── */}
      <LandingQuickCareDeck />

      {/* ───────── 4. FEATURES SHOWCASE ───────── */}
      <LandingFeaturesShowcase />

      {/* ───────── 5. PHARMACY DIRECTORY ───────── */}
      <LandingDirectorySection
        pharmacies={pharmacies}
        initialCity={city}
        initialQuery={q}
      />

      {/* ───────── 6. WHY AETHER — BENTO GRID ───────── */}
      <LandingBentoGrid />

      {/* ───────── 7. OTC ESSENTIALS ───────── */}
      <LandingOtcSpotlight />

      {/* ───────── 8. TRUST METRICS & TESTIMONIALS ───────── */}
      <LandingTrustMetrics />

      {/* ───────── 9. DATABASE TESTIMONIALS ───────── */}
      <PublicTestimonials limit={3} />

      {/* ───────── 10. FAQ SECTION ───────── */}
      <LandingFaqSection />

      {/* ───────── 11. CLOSING CTA BANNER ───────── */}
      <LandingCtaBanner />

      {/* ───────── 12. MOBILE ACTION BAR ───────── */}
      <LandingMobileActionBar />
    </div>
  );
}
