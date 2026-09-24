import Link from "next/link";
import { getBrowseLocation } from "@/app/lib/browse-location";
import { PageHead } from "@/app/components/listing/pieces";
import listStyles from "@/app/components/listing/listing.module.css";
import { listNetworkServiceListings } from "../lib/services/network-catalog";
import ServicesDirectory from "./ServicesDirectory";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Clinical Services & Appointments — Afyvia",
  description:
    "Explore pharmacy screenings, vaccinations, consultations and available clinical services across verified local pharmacies.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; bookable?: string }>;
}) {
  const sp = await searchParams;
  const origin = await getBrowseLocation();
  const q = sp.q?.trim() || "";
  const bookable = sp.bookable === "1";

  const data = await listNetworkServiceListings({ q: q || undefined, origin }).catch(() => null);
  const services = data?.services || [];

  return (
    <div className="afyvia-route-surface min-h-screen overflow-x-clip text-[var(--foreground)]">
      <section className="px-4 pb-28 pt-[var(--public-header-offset)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <PageHead
            kicker="Appointments"
            title="Services"
            aside={
              <Link className={listStyles.textLink} href="/medicines">
                Medicines
              </Link>
            }
          />
          <ServicesDirectory services={services} initialQuery={q} initialBookable={bookable} initialLocation={origin} />
        </div>
      </section>
    </div>
  );
}
