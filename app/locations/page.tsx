import Link from "next/link";
import { listDiscoveryLocations } from "@/app/lib/services/local-discovery";
import { locationPath } from "@/app/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Find pharmacies, medicines and health services by location in Kenya",
  description: "Browse verified Afyvia pharmacies by town. Find medicine listings, pharmacy services and local care providers across Kenya.",
  alternates: { canonical: "/locations" },
  openGraph: { title: "Find care by location in Kenya", description: "Explore verified Afyvia pharmacies, medicine listings and local health services by town.", url: "/locations" },
};
export default async function LocationsPage() {
  const cities = await listDiscoveryLocations();
  return <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-[var(--public-header-offset)]">
    <header className="page-hero-glass"><h1 className="text-3xl font-semibold">Find care by location</h1>
    <p className="my-4 text-[var(--muted)]">Explore towns with verified pharmacies on Afyvia. Compare medicines and services, or enable location when browsing to see distances from you.</p>
    </header>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cities.map(city => <Link className="care-glass rounded-2xl p-5" key={city} href={locationPath(city)}>Pharmacies, medicines and services in {city}</Link>)}</div>
    {!cities.length && <p>Local listings will appear as verified pharmacies publish their locations.</p>}
    <p className="mt-8"><Link href="/pharmacies">Browse all pharmacies</Link> · <Link href="/for-pharmacies">Add your pharmacy to Afyvia</Link></p>
  </div>;
}
