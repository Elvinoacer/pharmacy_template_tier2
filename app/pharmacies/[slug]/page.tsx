import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Camera,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Store,
} from "lucide-react";
import ContactForm from "@/app/components/ContactForm";
import { publicPharmacyProfile } from "@/app/lib/services/public-pharmacy-profile";
import styles from "./PharmacyProfile.module.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "About your pharmacy",
  description:
    "Explore pharmacy contact details, directions, opening hours, enquiries and photographs.",
};
export default async function PharmacyProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await publicPharmacyProfile(slug);
  if (!data) notFound();
  const { profile: p, gallery, hasPhone, hasEmail, hasWhatsapp } = data;
  let mapsEmbed = "";
  try {
    const url = new URL(p.mapsEmbed);
    if (
      url.protocol === "https:" &&
      ["www.google.com", "maps.google.com"].includes(url.hostname)
    )
      mapsEmbed = url.href;
  } catch {}
  const hasLocation = Boolean(
    p.address.street || p.address.city || p.latitude != null,
  );
  return (
    <div className={styles.page}>
      <Link href="/medicines" className={styles.back}>
        <ArrowLeft size={15} aria-hidden /> Back to medicines
      </Link>
      <section className={styles.hero}>
        <div className={styles.heroImage}>
          {p.coverImageUrl ? (
            <Image
              src={p.coverImageUrl}
              alt={`${p.name} — image supplied by the pharmacy`}
              fill
              priority
              sizes="(max-width: 700px) 100vw, 55vw"
              className="object-cover"
            />
          ) : (
            <div className={styles.noPhoto}>
              <Store size={48} aria-hidden />
              <span>A closer look at your pharmacy.</span>
              <small>This pharmacy hasn’t published a cover photo.</small>
            </div>
          )}
        </div>
        <div className={styles.identity}>
          <p className={styles.kicker}>MEET THE PEOPLE BEHIND YOUR CARE</p>
          <div className={styles.logo}>
            {p.logoUrl ? (
              <Image
                src={p.logoUrl}
                alt=""
                width={48}
                height={48}
                className="object-contain"
              />
            ) : (
              <Store size={25} aria-hidden />
            )}
          </div>
          <h1>{p.name}</h1>
          <p>{p.tagline || "Local care, connected to your next step."}</p>
          <span className={styles.location}>
            <MapPin size={15} aria-hidden />
            {[p.address.city, p.address.state].filter(Boolean).join(", ") ||
              "Location details not yet published"}
          </span>
          <div className={styles.actions}>
            {hasPhone && (
              <a href={p.phoneHref}>
                <Phone size={15} aria-hidden />
                Call pharmacy
              </a>
            )}
            {hasLocation && (
              <a
                href={p.mapsDirections}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation size={15} aria-hidden />
                Get directions
              </a>
            )}
            <a href="#enquiry">
              <MessageCircle size={15} aria-hidden />
              Make an enquiry
            </a>
          </div>
        </div>
      </section>
      <nav className={styles.tabs} aria-label="Pharmacy information">
        {[
          ["about", "About"],
          ["visit", "Visit & directions"],
          ["gallery", "Gallery"],
          ["enquiry", "Enquiries"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      <div className={styles.detailsGrid}>
        <section id="about" className={styles.panel}>
          <p className={styles.kicker}>YOUR PHARMACY, UP CLOSE</p>
          <h2>Care with a local connection.</h2>
          <p className={styles.body}>
            {p.about ||
              p.description ||
              `${p.name} is part of the Aether network. Contact the pharmacy to learn about its team, services, and care.`}
          </p>
          <div className={styles.contactList}>
            {hasPhone && (
              <a href={p.phoneHref}>
                <Phone size={17} aria-hidden />
                <span>
                  <small>PHONE</small>
                  {p.phone}
                </span>
                <ArrowUpRight size={17} aria-hidden />
              </a>
            )}
            {hasEmail && (
              <a href={`mailto:${p.email}`}>
                <Mail size={17} aria-hidden />
                <span>
                  <small>EMAIL</small>
                  {p.email}
                </span>
                <ArrowUpRight size={17} aria-hidden />
              </a>
            )}
            {hasWhatsapp && (
              <a
                href={p.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={17} aria-hidden />
                <span>
                  <small>WHATSAPP</small>Talk to the pharmacy
                </span>
                <ArrowUpRight size={17} aria-hidden />
              </a>
            )}
          </div>
        </section>
        <section className={styles.panel}>
          <p className={styles.kicker}>PLAN YOUR VISIT</p>
          <h2>
            <Clock size={22} aria-hidden />
            Opening hours
          </h2>
          {p.hours.length ? (
            <dl className={styles.hours}>
              {p.hours.map((h, i) => (
                <div key={`${h.day}-${i}`}>
                  <dt>{h.day}</dt>
                  <dd>{h.time}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className={styles.body}>
              Opening hours haven’t been published yet. Contact the pharmacy
              before you visit.
            </p>
          )}
          {p.deliveryNotes && (
            <div className={styles.delivery}>
              <h3>Delivery information</h3>
              <p>{p.deliveryNotes}</p>
            </div>
          )}
          <Link href="/medicines" className={styles.textLink}>
            Find available medicines <ArrowUpRight size={15} aria-hidden />
          </Link>
        </section>
      </div>
      <section id="visit" className={styles.visit}>
        <div className={styles.panel}>
          <p className={styles.kicker}>FIND YOUR WAY HERE</p>
          <h2>
            A familiar place,
            <br />
            <em>a simple route.</em>
          </h2>
          <p className={styles.body}>
            {hasLocation
              ? p.address.full
              : "Address details haven’t been published yet."}
          </p>
          {p.latitude == null && hasLocation && (
            <p className={styles.small}>
              The pharmacy hasn’t provided an exact map pin. Directions use its
              published address.
            </p>
          )}
          {hasLocation && (
            <a
              href={p.mapsDirections}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.direction}
            >
              <Navigation size={16} aria-hidden />
              Open directions
              <ArrowUpRight size={16} aria-hidden />
            </a>
          )}
        </div>
        <div className={styles.map}>
          {mapsEmbed ? (
            <iframe
              src={mapsEmbed}
              title={`Map showing ${p.name}`}
              loading="lazy"
              referrerPolicy="no-referrer"
              allowFullScreen
            />
          ) : (
            <div className={styles.noPhoto}>
              <MapPin size={35} aria-hidden />
              <span>Exact map location not yet published.</span>
              {hasLocation && (
                <a
                  href={p.mapsDirections}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View published address in Maps ↗
                </a>
              )}
            </div>
          )}
        </div>
      </section>
      <section id="gallery" className={styles.gallerySection}>
        <p className={styles.kicker}>A LOOK INSIDE</p>
        <h2>Get to know the space.</h2>
        {gallery.length ? (
          <div className={styles.gallery}>
            {gallery.map((g, i) => (
              <a
                key={`${g.src}-${i}`}
                href={g.src}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${g.caption || "pharmacy photo"}`}
              >
                <div>
                  <Image
                    src={g.src}
                    alt={g.alt}
                    fill
                    sizes="(max-width: 700px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                {g.caption && (
                  <span>
                    {g.caption}
                    <ArrowUpRight size={14} aria-hidden />
                  </span>
                )}
              </a>
            ))}
          </div>
        ) : (
          <div className={styles.emptyGallery}>
            <Camera size={27} aria-hidden />
            <p>
              The pharmacy’s own photos will appear here when they are
              published.
            </p>
          </div>
        )}
      </section>
      <section id="enquiry" className={styles.enquiry}>
        <div>
          <p className={styles.kicker}>A QUESTION IS A GOOD START</p>
          <h2>
            Let’s put you
            <br />
            <em>in touch.</em>
          </h2>
          <p className={styles.body}>
            Ask {p.name} about a service, collection, delivery, or a medicine
            listing. Your enquiry goes directly to its team.
          </p>
        </div>
        <div className={styles.panel}>
          <ContactForm pharmacySlug={slug} />
        </div>
      </section>
    </div>
  );
}
