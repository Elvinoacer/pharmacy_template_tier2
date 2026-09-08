import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import CtaBanner from "../components/CtaBanner";
import PageHero from "../components/PageHero";
import Reveal from "../components/Reveal";
import StorefrontUnavailable from "@/app/components/StorefrontUnavailable";
import { platform } from "../lib/data";
import { getStorefrontView } from "../lib/services/storefront-content";
import { ArrowRight, HeartPulse, ShieldCheck, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About",
  description: `About ${platform.legalName} — Kenya’s neighbourhood pharmacy network, and the independent shops that belong to it.`,
  alternates: { canonical: "/about" },
};

const adaptiveCard =
  "rounded-3xl border border-[var(--line-2)] bg-[var(--card)] shadow-sm transition-colors duration-300";

function NetworkAbout() {
  return (
    <div className="bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      <PageHero
        eyebrow="About the network"
        title="A country of pharmacies. One promise of care."
        description={platform.promise + " Aether is the rails independent pharmacies share — never a takeover of the counter."}
        crumbs={[{ label: "About" }]}
      />

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-xl ring-1 ring-[var(--line-2)]">
              <Image
                src="https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp"
                alt="Neighbourhood pharmacy interior"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">Our story</p>
              <h2
                className="mt-2 text-2xl font-semibold text-[var(--foreground)] sm:text-3xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Built so Kenya can find a pharmacist — and pharmacies can still be themselves.
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
                <p>
                  Aether started from a simple observation: families already have a neighbourhood pharmacy they
                  trust, but the internet still pretends there is only one shop in the country.
                </p>
                <p>
                  We built a network instead. Every live listing is licence-reviewed. Every tenant keeps their
                  brand, their M-Pesa, their staff, and their clinical record. Patients keep one account that
                  works from Nairobi to the coast.
                </p>
                <p>
                  The first impression we protect is not a campaign line. It is a duty: life, and caring, before
                  anything else on the page.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
          <div className={`${adaptiveCard} p-8`}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">Mission</p>
            <p
              className="mt-3 text-xl font-semibold text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Make safe, understandable pharmacy care easy to reach — without erasing the shop that provides it.
            </p>
          </div>
          <div className={`${adaptiveCard} p-8`}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">Vision</p>
            <p
              className="mt-3 text-xl font-semibold text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              A Kenya where every neighbourhood pharmacy can be found, trusted, and chosen — on its own terms.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Verified first", body: "PPB premises review before a pharmacy appears on the marketplace." },
            { icon: Building2, title: "Tenant isolation", body: "Inventory, refills, loyalty, and messages never cross shop boundaries." },
            { icon: HeartPulse, title: "One patient identity", body: "Your login works across the network. Clinical records stay with the pharmacy that earned them." },
          ].map((c) => (
            <div key={c.title} className={`${adaptiveCard} p-6`}>
              <c.icon className="h-6 w-6 text-[var(--brand)]" />
              <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3">
          <Link href="/#pharmacies" className="btn-primary">
            Find a pharmacy
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/for-pharmacies" className="btn-ghost">
            Join as a pharmacy
          </Link>
        </div>
      </section>
    </div>
  );
}

export default async function AboutPage() {
  const view = await getStorefrontView();
  if (view.status === "unavailable") {
    return <StorefrontUnavailable slug={view.slug} next="/about" />;
  }
  if (view.status !== "active") return <NetworkAbout />;

  const pharmacy = view.resolved;
  const content = view.content;
  const values = content.about.values;
  const aboutCopy =
    pharmacy.about ||
    `${pharmacy.name} is an independent pharmacy on the Aether network — careful dispensing, personal attention, and a counter that still looks up when you walk in.`;

  return (
    <div className="bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      <PageHero
        eyebrow="About us"
        title={pharmacy.name}
        description={pharmacy.tagline || aboutCopy}
        crumbs={[{ label: "About" }]}
      />

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-xl ring-1 ring-[var(--line-2)]">
              <Image
                src={pharmacy.coverImageUrl || "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp"}
                alt={`${pharmacy.name} interior`}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">Our story</p>
              <h2
                className="mt-2 text-2xl font-semibold text-[var(--foreground)] sm:text-3xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {content.about.storyHeading}
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
                <p>{aboutCopy}</p>
                {pharmacy.address.full && <p>Find us at {pharmacy.address.full}.</p>}
                <p>{content.about.closingNote}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className={`${adaptiveCard} p-6`}>
              <h3 className="font-semibold text-[var(--foreground)]">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{v.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team + gallery are template content every tenant can personalise from
          the Storefront Studio (/admin/settings/storefront) — real rooms no
          longer inherit another pharmacy's staff photos by hard-coding. */}
      {content.about.showTeam && content.team.length > 0 && (
        <section className="px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2
              className="text-2xl font-semibold text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              The people at the counter
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {content.team.map((m) => (
                <article
                  key={m.id}
                  className="glass-tile-strong overflow-hidden rounded-3xl border border-[var(--line-2)] bg-[var(--card)] transition-colors duration-300"
                >
                  {m.photo && (
                    <div className="relative aspect-[4/5]">
                      <Image src={m.photo} alt={m.name} fill className="object-cover" sizes="240px" />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="font-semibold text-[var(--foreground)]">{m.name}</p>
                    <p className="text-xs font-medium text-[var(--brand)]">{m.role}</p>
                    {m.bio && <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{m.bio}</p>}
                    {m.qualifications && (
                      <p className="mt-2 text-xs font-medium text-[var(--brand)]">{m.qualifications}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {content.sections.insuranceStrip && content.certifications.length > 0 && (
        <section className="px-4 pb-8 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="glass-panel flex flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl border border-[var(--line-2)] bg-[var(--card)] p-5 transition-colors duration-300 sm:p-6">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand)]">
                <ShieldCheck className="h-4 w-4" aria-hidden /> Credentials
              </span>
              {content.certifications.map((c) => (
                <span key={c} className="text-sm font-medium text-[var(--foreground)]">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {content.about.showGallery && content.gallery.length > 0 && (
        <section className="px-4 pb-8 sm:px-6">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 sm:grid-cols-3">
            {content.gallery.slice(0, 6).map((g) => (
              <div
                key={g.src}
                className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-inset ring-[var(--line-2)]"
              >
                <Image src={g.src} alt={g.alt} fill className="object-cover" sizes="33vw" />
              </div>
            ))}
          </div>
        </section>
      )}

      <CtaBanner
        title={`Visit ${pharmacy.name}`}
        description="Call, WhatsApp, or send a message — we are here to help."
        primaryHref="/contact"
        primaryLabel="Contact us"
        secondaryHref="/refill"
        secondaryLabel="Request a refill"
      />
    </div>
  );
}
