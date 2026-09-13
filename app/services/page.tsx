import NearbyLocation from "@/app/components/location/NearbyLocation";
import { getBrowseLocation } from "@/app/lib/browse-location";
import { distanceLabel } from "@/app/lib/proximity";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  HeartPulse,
  Search,
} from "lucide-react";
import CareHero from "../components/care/CareHero";
import { listNetworkServiceListings } from "../lib/services/network-catalog";
import { formatPrice } from "../lib/format";
import styles from "../components/care/CarePages.module.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Find your next moment of care",
  description:
    "Explore pharmacy screenings, vaccinations, consultations and available services.",
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
  const data = await listNetworkServiceListings({ q, origin }).catch(() => null);
  const services = data?.services.filter((s) => !bookable || s.bookable) || [];
  return (
    <div className={styles.page}>
      <CareHero
        section="services"
        eyebrow="CARE BEYOND MEDICINE"
        title="Care you need."
        accent="Close to home."
        description="Find a service, see the price, book your visit."
      />
      <NearbyLocation active={Boolean(origin)} />
      <section className={styles.searchPanel} aria-label="Find a service">
        <form action="/services" className={styles.searchForm} role="search">
          <label htmlFor="service-query">
            What kind of care do you need?
            <input
              id="service-query"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Screening, vaccination, consultation…"
            />
          </label>
          <label className={styles.category} htmlFor="service-bookable">
            Availability
            <select
              id="service-bookable"
              name="bookable"
              defaultValue={bookable ? "1" : ""}
            >
              <option value="">All services</option>
              <option value="1">Online booking available</option>
            </select>
          </label>
          <button className={styles.primary}>
            <Search size={17} aria-hidden /> Find care
          </button>
        </form>
        <div className={styles.hint}>
          <span>
            Pick the service you need. The listing keeps its provider and
            booking details connected.
          </span>
          <Link href="/prescription">
            Need medicine instead? <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </section>
      <div className={styles.sectionHeading}>
        <div>
          <h2>{q ? `Care matching “${q}”` : "Care for your everyday"}</h2>
          <p>
            Real services, with pricing and booking options where published.
          </p>
        </div>
        <span className={styles.count}>
          {services.length} service{services.length === 1 ? "" : "s"}
        </span>
      </div>
      {services.length ? (
        <div className={styles.serviceGrid}>
          {services.map((s) => (
            <article key={s.id} className={styles.serviceCard}>
              <Link
                href={s.href}
                className={styles.serviceImage}
                aria-label={`View ${s.title}`}
              >
                <Image
                  src={s.imageUrl || "/images/care/editorial-pharmacy.png"}
                  alt={s.imageUrl ? s.title : ""}
                  fill
                  sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw"
                />
                <span className={styles.badge}>
                  <CalendarDays size={13} aria-hidden />
                  {s.bookable ? "Online booking" : "Enquire about this service"}
                </span>
                {!s.imageUrl && (
                  <span className={styles.imageCredit}>
                    Illustrative imagery
                  </span>
                )}
              </Link>
              <div className={styles.serviceBody}>
                <Link href={s.href}>
                  <h3>{s.title}</h3>
                </Link>
                <p>{s.short}</p>
                <p className="text-xs font-semibold text-[var(--brand)]">{distanceLabel(s.distanceKm) || s.pharmacy.city}</p>
                <Link
                  href={`/pharmacies/${s.pharmacy.slug}`}
                  className={styles.provider}
                >
                  Care by {s.pharmacy.name}
                  <ArrowUpRight size={12} aria-hidden />
                </Link>
                <Link href={s.href} className={styles.serviceFoot}>
                  <strong>
                    {s.price != null
                      ? `KES ${formatPrice(s.price)}`
                      : "Ask about pricing"}
                  </strong>
                  <span>
                    {s.bookable ? "View & book" : "Explore service"}
                    <ArrowRight size={16} aria-hidden />
                  </span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <HeartPulse size={34} aria-hidden />
          <h3>
            {!data
              ? "We couldn’t load services just now."
              : q
                ? "Let’s try a different search."
                : "New care services will appear here."}
          </h3>
          <p>
            {!data
              ? "Please refresh and try again. Your search is still here."
              : q
                ? "Try a broader service name or explore all available care."
                : "Pharmacies publish their services, prices, and booking options here. In the meantime, explore medicines or prepare a refill request."}
          </p>
          <Link
            href={q ? "/services" : "/medicines"}
            className={styles.primary}
          >
            {q ? "Explore all care" : "Explore medicines"}
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      )}
      <p className={styles.bottomNote}>
        Your booking stays connected to the service provider. View the pharmacy
        profile for opening hours, location, enquiries, and directions.
      </p>
    </div>
  );
}
