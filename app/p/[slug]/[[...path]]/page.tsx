import MedicineDetailPage from "@/app/medicines/[slug]/page";
import ServiceDetailPage from "@/app/services/[slug]/page";
import GuestOrderPage from "@/app/order/page";
import RefillPage from "@/app/refill/page";
import CareersPage from "@/app/careers/page";
import ContactPage from "@/app/contact/page";
import DeliveryPage from "@/app/delivery/page";
import FaqPage from "@/app/faq/page";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Store, MapPin, ArrowUpRight, Phone, Camera } from "lucide-react";
import { publicPharmacyProfile } from "@/app/lib/services/public-pharmacy-profile";
import { publicStorefrontMedicines, publicStorefrontServices } from "@/app/lib/services/public-storefront-catalog";
import { publicStorefrontRoute } from "@/app/lib/public-storefront";
import { prismaUnscoped } from "@/app/lib/db";
import { buildPublicInventoryWhere } from "@/app/lib/services/public-medication-visibility";
import styles from "../Storefront.module.css";

export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ slug: string; path?: string[] }>;
  searchParams: Promise<{ q?: string; page?: string; medicationId?: string; slug?: string }>;
};
const sections = [
  ["", "Overview"],
  ["about", "About"],
  ["medicines", "Medicines"],
  ["services", "Services"],
  ["delivery", "Delivery"],
  ["faq", "FAQ"],
  ["careers", "Careers"],
  ["gallery", "Gallery"],
  ["location", "Visit"],
  ["contact", "Contact"],
];
const money = (value: unknown) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 2 }).format(Number(value));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, path } = await params;
  const route = publicStorefrontRoute(path);
  if (!route) notFound();
  const data = await publicPharmacyProfile(slug);
  if (!data) notFound();
  const p = data.profile;

  if (route.section === "medicines" && route.detail) {
    const med = await prismaUnscoped.pharmacyInventory.findFirst({
      where: buildPublicInventoryWhere({
        slug: route.detail,
        pharmacyId: p.id,
      }),
      include: {
        medicationMaster: { select: { name: true, description: true, imageUrl: true } },
      },
    });
    if (!med) notFound();
    const medTitle = `${med.medicationMaster.name} · ${p.name}`;
    const medDesc = med.medicationMaster.description || `Buy ${med.medicationMaster.name} online at ${p.name}.`;
    const medImages = med.medicationMaster.imageUrl ? [med.medicationMaster.imageUrl] : p.coverImageUrl ? [p.coverImageUrl] : [];
    return {
      title: { absolute: medTitle },
      description: medDesc,
      alternates: { canonical: `/p/${p.slug}/medicines/${encodeURIComponent(med.slug)}` },
      openGraph: { title: medTitle, description: medDesc, images: medImages },
      twitter: { title: medTitle, description: medDesc, images: medImages },
    };
  }

  const title = `${route.section === "home" ? "Overview" : route.section[0].toUpperCase() + route.section.slice(1)} · ${p.name}`;
  const description = p.description || `Explore medicines, services and visiting information published by ${p.name}.`;
  const images = p.coverImageUrl ? [p.coverImageUrl] : [];
  return { title: { absolute: title }, description, alternates: { canonical: `/p/${p.slug}${path?.length ? `/${path.map(encodeURIComponent).join("/")}` : ""}` }, openGraph: { title, description, images }, twitter: { title, description, images } };
}

export default async function PublicStorefrontPage({ params, searchParams }: Props) {
  const { slug, path } = await params;
  const route = publicStorefrontRoute(path);
  if (!route) notFound();
  const data = await publicPharmacyProfile(slug);
  if (!data) notFound();
  const { profile: p, gallery, hasPhone, hasEmail, hasWhatsapp } = data;
  const base = `/p/${p.slug}`;
  const { section, detail } = route;
  const search = await searchParams;
  const q = typeof search.q === "string" ? search.q.trim().slice(0, 120) : "";
  const parsedPage = Number(search.page);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 && parsedPage <= 10000 ? parsedPage : 1;
  if (section === "medicines" && detail) return MedicineDetailPage({ params: Promise.resolve({ slug: detail, pharmacySlug: slug }) });
  if (section === "services" && detail) return ServiceDetailPage({ params: Promise.resolve({ slug: detail }) });
  if (section === "order") return GuestOrderPage({ searchParams: Promise.resolve(search) });
  if (section === "refill") return RefillPage({ searchParams: Promise.resolve({}) });
  if (section === "careers") return CareersPage();
  if (section === "contact") return ContactPage();
  if (section === "delivery") return DeliveryPage();
  if (section === "faq") return FaqPage();
  const medicines = section === "medicines" ? await publicStorefrontMedicines(slug, detail ? "" : q, page, detail) : null;
  const services = section === "services" ? await publicStorefrontServices(slug, detail) : null;
  if (detail && !(medicines?.length || services?.length)) notFound();
  const hasLocation = Boolean(p.address.street || p.address.city || (p.latitude != null && p.longitude != null));
  let mapsEmbed = "";
  try {
    const url = new URL(p.mapsEmbed);
    if (url.protocol === "https:" && ["www.google.com", "maps.google.com"].includes(url.hostname)) mapsEmbed = url.href;
  } catch {}
  const brand = /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(p.brandPrimary || "") ? p.brandPrimary : undefined;
  const pageLink = (next: number) => `${base}/medicines?${new URLSearchParams({ ...(q ? { q } : {}), page: String(next) })}`;
  return (
    <div className={styles.storefront} style={{ "--shop-accent": brand || "var(--brand)" } as CSSProperties}>
      <header className={styles.header}>
        <Link href={base} className={styles.identity}>
          {p.logoUrl ? <Image src={p.logoUrl} alt="" width={40} height={40} unoptimized /> : <Store size={28} aria-hidden />}
          <span>{p.name}<small>Dispensary & care storefront</small></span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <Link href={`/pharmacies/${p.slug}`} className={styles.network} title="View full profile and map directions">
            Pharmacy Profile & Directions <ArrowUpRight size={14} aria-hidden />
          </Link>
          <Link href="/pharmacies" className={styles.network}>
            Explore the network <ArrowUpRight size={14} aria-hidden />
          </Link>
        </div>
      </header>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <nav className={styles.nav} aria-label={`${p.name} pages`}>
        {sections.map(([part, label]) => <Link key={part} href={`${base}${part ? `/${part}` : ""}`} aria-current={(part || "home") === section ? "page" : undefined}>{label}</Link>)}
      </nav>
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <p className={styles.eyebrow}>{p.name} / {detail ? section : section === "home" ? "Welcome" : section}</p>
        <h1>{detail ? medicines?.[0]?.medicationMaster.name || services?.[0]?.title : section === "home" ? p.name : section === "location" ? "Plan your visit." : `${section[0].toUpperCase()}${section.slice(1)} at ${p.name}`}</h1>
        {section === "home" && <section className={styles.hero}>
          <div><p className={styles.lead}>{p.tagline || p.description || "Explore this pharmacy’s medicines, services and visiting information."}</p>
            {hasLocation && <p className={styles.location}><MapPin size={17} aria-hidden />{p.address.full}</p>}
            <div className={styles.actions}><Link href={`${base}/medicines`}>Browse medicines <ArrowUpRight size={17} aria-hidden /></Link><Link href={`${base}/location`}>Plan a visit</Link></div>
          </div>
          <div className={styles.cover}>{p.coverImageUrl ? <Image src={p.coverImageUrl} alt={`${p.name}, photo supplied by the pharmacy`} fill priority unoptimized sizes="(max-width: 700px) 100vw, 50vw" /> : <div className={styles.placeholder}><Store size={48} aria-hidden /><span>Welcome to {p.name}</span></div>}</div>
        </section>}
        {(section === "home" || section === "about") && <section className={styles.panel}><p className={styles.eyebrow}>About your pharmacy</p><h2>Care, close to you.</h2><p className={styles.copy}>{p.about?.trim() || p.description?.trim() || "This pharmacy hasn’t published its story yet."}</p>{p.deliveryNotes && <><h3>Delivery information</h3><p className={styles.copy}>{p.deliveryNotes}</p></>}</section>}
        {section === "medicines" && <>
          {!detail && <form action={`${base}/medicines`} className={styles.search}><label htmlFor="medicine-search">Search medicines at {p.name}</label><div><input id="medicine-search" name="q" defaultValue={q} placeholder="Medicine or generic name" maxLength={120} /><button type="submit">Search</button></div></form>}
          <p className={styles.note}>Listings published by this pharmacy. Confirm availability and final pricing with its team.</p>
          <div className={styles.grid}>{medicines?.slice(0, 24).map(item => <article key={item.id} className={styles.panel}><p className={styles.eyebrow}>{item.prescriptionRequired ? "Prescription required" : "Medicine listing"}</p><h2>{detail ? item.medicationMaster.name : <Link href={`${base}/medicines/${encodeURIComponent(item.slug)}`}>{item.medicationMaster.name} ↗</Link>}</h2><p className={styles.copy}>{[item.medicationMaster.genericName, item.medicationMaster.strengthDisplay, item.medicationMaster.packSize].filter(Boolean).join(" · ")}</p><p className={styles.price}>{Number(item.price) > 0 ? money(item.price) : "Ask pharmacy for price"}</p>{detail && <p className={styles.copy}>{item.medicationMaster.description}</p>}</article>)}</div>
          {!medicines?.length && <p className={styles.empty}>{q ? "No listings match your search at this pharmacy." : "This pharmacy hasn’t published medicine listings yet."}</p>}
          {!detail && <nav className={styles.actions} aria-label="Medicine result pages">{page > 1 && <Link href={pageLink(page - 1)}>Previous</Link>}{medicines && medicines.length > 24 && <Link href={pageLink(page + 1)}>Next</Link>}</nav>}
        </>}
        {section === "services" && <><p className={styles.lead}>Services published by {p.name}. Contact the team to arrange a visit.</p><div className={styles.grid}>{services?.map(item => <article key={item.id} className={styles.panel}><h2>{detail ? item.title : <Link href={`${base}/services/${encodeURIComponent(item.slug)}`}>{item.title} ↗</Link>}</h2><p className={styles.copy}>{detail ? item.description : item.short}</p>{item.duration && <p className={styles.note}>{item.duration}</p>}<p className={styles.price}>{item.price != null ? money(item.price) : "Ask pharmacy for price"}</p>{detail && item.eligibility && <p className={styles.copy}>{item.eligibility}</p>}</article>)}</div>{!services?.length && <p className={styles.empty}>This pharmacy hasn’t published services yet.</p>}</>}
        {section === "gallery" && <><p className={styles.lead}>A look inside, through this pharmacy’s own photos.</p>{gallery.length ? <div className={styles.gallery}>{gallery.map((photo, index) => <figure key={`${photo.src}-${index}`}><a href={photo.src} target="_blank" rel="noopener noreferrer" aria-label={`Open ${photo.caption || `photo ${index + 1}`}`}><Image src={photo.src} alt={photo.alt} width={720} height={540} unoptimized /></a>{photo.caption && <figcaption>{photo.caption}</figcaption>}</figure>)}</div> : <div className={styles.empty}><Camera size={28} aria-hidden /><p>This pharmacy hasn’t published photos yet.</p></div>}</>}
        {section === "location" && <section className={styles.grid}>
          <div className={styles.panel}><h2>Find us</h2><p className={styles.copy}>{hasLocation ? p.address.full : "Address details haven’t been published yet."}</p>{hasLocation && <a className={styles.textLink} href={p.mapsDirections} target="_blank" rel="noopener noreferrer">Get directions ↗</a>}{hasLocation && p.latitude == null && <p className={styles.note}>Directions use the published address; an exact map pin hasn’t been provided.</p>}{mapsEmbed && <iframe className={styles.map} src={mapsEmbed} title={`Map of ${p.name}`} loading="lazy" referrerPolicy="no-referrer" />}</div>
          <div className={styles.panel}><h2>Opening hours</h2>{p.hours.length ? <dl className={styles.hours}>{p.hours.map((hour, index) => <div key={`${hour.day}-${index}`}><dt>{hour.day}</dt><dd>{hour.time}</dd></div>)}</dl> : <p className={styles.copy}>Hours haven’t been published yet. Check with the pharmacy before you visit.</p>}</div>
        </section>}
        <section className={styles.contact}><div><p className={styles.eyebrow}>Talk to {p.name}</p><h2>A question? Start here.</h2></div><div className={styles.actions}>{hasPhone && <a href={p.phoneHref}><Phone size={16} aria-hidden />{p.phone}</a>}{hasEmail && <a href={`mailto:${p.email}`}>Email pharmacy</a>}{hasWhatsapp && <a href={p.whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>}{!hasPhone && !hasEmail && !hasWhatsapp && <p className={styles.note}>Contact details haven’t been published yet.</p>}</div></section>
      </main>
      <footer className={styles.footer}><span>{p.name}</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/pharmacies">Aether pharmacy network ↗</Link></div></footer>
    </div>
  );
}
