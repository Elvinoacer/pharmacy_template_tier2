import { getMarketplaceFeaturedPharmacies } from "@/app/lib/services/pharmacy-directory";
import { platform } from "@/app/lib/data";
import AetherLanding from "./components/landing/AetherLanding";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${platform.name} — ${platform.tagline}`,
  description: platform.description,
};

export default async function MarketplacePage() {
  const featuredPharmacies = await getMarketplaceFeaturedPharmacies();

  return <AetherLanding pharmacies={featuredPharmacies} />;
}
