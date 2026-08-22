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
    <div className="landing-root min-h-screen bg-[#f8fafc] text-[#0f172a] pb-16 lg:pb-0">
      {/* ───────── 1. MINIMALIST VISUAL HERO ───────── */}
      <LandingHeroInteractive
        platformPromise={platform.promise}
        platformDescription={platform.description}
        initialQuery={q}
        pharmacyCount={pharmacies.length || 12}
      />

      {/* ───────── 2. 60-SECOND CARE PATHWAYS ───────── */}
      <LandingQuickCareDeck />

      {/* ───────── 3. PHARMACY DIRECTORY & LOCATIONS ───────── */}
      <LandingDirectorySection
        pharmacies={pharmacies}
        initialCity={city}
        initialQuery={q}
      />

      {/* ───────── 4. WHY AETHER — VISUAL BENTO GRID ───────── */}
      <LandingBentoGrid />

      {/* ───────── 5. OTC ESSENTIALS CAROUSEL ───────── */}
      <LandingOtcSpotlight />

      {/* ───────── 6. TRUST METRICS & COMMUNITY QUOTES ───────── */}
      <LandingTrustMetrics />

      {/* ───────── 7. DATABASE TESTIMONIALS (IF ANY) ───────── */}
      <PublicTestimonials limit={3} />

      {/* ───────── 8. ACCORDION FAQ ───────── */}
      <LandingFaqSection />

      {/* ───────── 9. MINIMALIST CLOSING BANNER ───────── */}
      <LandingCtaBanner />

      {/* ───────── 10. MOBILE FLOATING ACTION DOCK ───────── */}
      <LandingMobileActionBar />
    </div>
  );
}
