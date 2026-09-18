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

const pageShell =
  "afyvia-route-surface min-h-screen overflow-x-hidden text-[var(--foreground)] transition-colors duration-300";

const adaptiveCard =
  "liquid-glass care-glass rounded-[1.35rem] transition-colors duration-300 sm:rounded-3xl";

const storyPanel =
  "liquid-glass care-glass mx-auto grid max-w-6xl gap-6 rounded-[1.5rem] p-4 sm:gap-8 sm:rounded-[2rem] sm:p-6 lg:grid-cols-2 lg:items-center lg:gap-10 lg:p-8";

function NetworkAbout() {
  return (
    <div className={pageShell}>
      <PageHero
        eyebrow="About the network"
        title="A country of pharmacies. One promise of care."
        description={platform.promise + " Afyvia is the rails independent pharmacies share — never a takeover of the counter."}
        crumbs={[{ label: "About" }]}
      />

      <section className="px-3 pb-10 sm:px-6 sm:pb-16">
        <div className={storyPanel}>
          <Reveal>
            <div className="relative aspect-[16/11] overflow-hidden rounded-[1.4rem] shadow-lg ring-1 ring-[var(--line-2)] sm:aspect-[4/3] sm:rounded-[2rem] sm:shadow-xl">
              <Image
                src="https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp"
                alt="Neighbourhood pharmacy interior"
                fill
                className="object-cover"
                sizes="(max-width: 640px) calc(100vw - 24px), (max-width: 1024px) calc(100vw - 48px), 50vw"
                priority
              />
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="min-w-0 px-1 sm:px-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs sm:tracking-[0.2em]">Our story</p>
              <h2
                className="mt-2 break-words text-[1.65rem] font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--foreground)] sm:text-3xl sm:leading-tight"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Built so Kenya can find a pharmacist — and pharmacies can still be themselves.
              </h2>
              <div className="mt-4 space-y-3 text-[13.5px] leading-6 text-[var(--muted)] sm:space-y-4 sm:text-base sm:leading-relaxed">
                <p>
                  Afyvia started from a simple observation: families already have a neighbourhood pharmacy they
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

      <section className="px-3 py-5 sm:px-6 sm:py-8">
        <div className="mx-auto grid max-w-6xl gap-3 sm:gap-5 md:grid-cols-2">
          <div className={`${adaptiveCard} p-5 sm:p-8`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs sm:tracking-[0.2em]">Mission</p>
            <p
              className="mt-2.5 text-[1.08rem] font-semibold leading-snug text-[var(--foreground)] sm:mt-3 sm:text-xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Make safe, understandable pharmacy care easy to reach — without erasing the shop that provides it.
            </p>
          </div>
          <div className={`${adaptiveCard} p-5 sm:p-8`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs sm:tracking-[0.2em]">Vision</p>
            <p
              className="mt-2.5 text-[1.08rem] font-semibold leading-snug text-[var(--foreground)] sm:mt-3 sm:text-xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              A Kenya where every neighbourhood pharmacy can be found, trusted, and chosen — on its own terms.
            </p>
          </div>
        </div>
      </section>

      <section className="px-3 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-3 sm:gap-5 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Verified first", body: "PPB premises review before a pharmacy appears on the marketplace." },
            { icon: Building2, title: "Tenant isolation", body: "Inventory, refills, loyalty, and messages never cross shop boundaries." },
            { icon: HeartPulse, title: "One patient identity", body: "Your login works across the network. Clinical records stay with the pharmacy that earned them." },
          ].map((c) => (
            <div key={c.title} className={`${adaptiveCard} flex items-start gap-3 p-4 sm:p-5 md:block md:p-6`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] sm:h-11 sm:w-11">
                <c.icon className="h-5 w-5 text-[var(--brand)] sm:h-6 sm:w-6" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold leading-tight text-[var(--foreground)] md:mt-4 md:text-lg">{c.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-5 text-[var(--muted)] sm:text-sm sm:leading-relaxed">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-3 pb-14 sm:px-6 sm:pb-20">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-center">
          <Link href="/#pharmacies" className="btn-primary w-full justify-center sm:w-auto">
            Find a pharmacy
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/for-pharmacies" className="btn-ghost w-full justify-center sm:w-auto">
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
    `${pharmacy.name} is an independent pharmacy on the Afyvia network — careful dispensing, personal attention, and a counter that still looks up when you walk in.`;

  return (
    <div className={pageShell}>
      <PageHero
        eyebrow="About us"
        title={pharmacy.name}
        description={pharmacy.tagline || aboutCopy}
        crumbs={[{ label: "About" }]}
      />

      <section className="px-3 pb-10 sm:px-6 sm:pb-16">
        <div className={storyPanel}>
          <Reveal>
            <div className="relative aspect-[16/11] overflow-hidden rounded-[1.4rem] shadow-lg ring-1 ring-[var(--line-2)] sm:aspect-[4/3] sm:rounded-[2rem] sm:shadow-xl">
              <Image
                src={pharmacy.coverImageUrl || "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp"}
                alt={`${pharmacy.name} interior`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) calc(100vw - 24px), (max-width: 1024px) calc(100vw - 48px), 50vw"
                priority
              />
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="min-w-0 px-1 sm:px-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs sm:tracking-[0.2em]">Our story</p>
              <h2
                className="mt-2 break-words text-[1.65rem] font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--foreground)] sm:text-3xl sm:leading-tight"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {content.about.storyHeading}
              </h2>
              <div className="mt-4 space-y-3 break-words text-[13.5px] leading-6 text-[var(--muted)] sm:space-y-4 sm:text-base sm:leading-relaxed">
                <p>{aboutCopy}</p>
                {pharmacy.address.full && <p>Find us at {pharmacy.address.full}.</p>}
                <p>{content.about.closingNote}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-3 py-5 sm:px-6 sm:py-8">
        <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className={`${adaptiveCard} min-w-0 p-5 sm:p-6`}>
              <h3 className="break-words text-[15px] font-semibold leading-tight text-[var(--foreground)] sm:text-base">{v.title}</h3>
              <p className="mt-2 break-words text-[12.5px] leading-5 text-[var(--muted)] sm:text-sm sm:leading-relaxed">{v.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team + gallery are template content every tenant can personalise from
          the Storefront Studio (/admin/settings/storefront) — real rooms no
          longer inherit another pharmacy's staff photos by hard-coding. */}
      {content.about.showTeam && content.team.length > 0 && (
        <section className="px-3 py-10 sm:px-6 sm:py-12">
          <div className="mx-auto max-w-6xl">
            <h2
              className="text-[1.65rem] font-semibold leading-tight text-[var(--foreground)] sm:text-2xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              The people at the counter
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-6 lg:grid-cols-4">
              {content.team.map((m) => (
                <article
                  key={m.id}
                  className="care-glass min-w-0 overflow-hidden rounded-[1.25rem] transition-colors duration-300 sm:rounded-3xl"
                >
                  {m.photo && (
                    <div className="relative aspect-[4/5]">
                      <Image
                        src={m.photo}
                        alt={m.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 46vw, (max-width: 1024px) 50vw, 240px"
                      />
                    </div>
                  )}
                  <div className="min-w-0 p-3 sm:p-4">
                    <p className="break-words text-sm font-semibold leading-tight text-[var(--foreground)] sm:text-base">{m.name}</p>
                    <p className="mt-1 break-words text-[10px] font-medium leading-tight text-[var(--brand)] sm:text-xs">{m.role}</p>
                    {m.bio && <p className="mt-2 hidden text-sm leading-relaxed text-[var(--muted)] sm:block">{m.bio}</p>}
                    {m.qualifications && (
                      <p className="mt-2 break-words text-[10px] font-medium leading-tight text-[var(--brand)] sm:text-xs">
                        {m.qualifications}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {content.sections.insuranceStrip && content.certifications.length > 0 && (
        <section className="px-3 pb-8 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="care-glass flex flex-col items-start gap-3 rounded-[1.35rem] p-4 transition-colors duration-300 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-3 sm:rounded-3xl sm:p-6">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-xs sm:tracking-[0.18em]">
                <ShieldCheck className="h-4 w-4" aria-hidden /> Credentials
              </span>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                {content.certifications.map((c) => (
                  <span
                    key={c}
                    className="max-w-full break-words rounded-full border border-[var(--line-2)] bg-[var(--card-elev)] px-3 py-1.5 text-[11px] font-medium leading-tight text-[var(--foreground)] sm:text-sm"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {content.about.showGallery && content.gallery.length > 0 && (
        <section className="px-3 pb-8 sm:px-6">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {content.gallery.slice(0, 6).map((g, index) => (
              <div
                key={g.src}
                className={`relative overflow-hidden rounded-[1rem] ring-1 ring-inset ring-[var(--line-2)] sm:rounded-2xl ${
                  index === 0 ? "col-span-2 aspect-[16/9] sm:col-span-1 sm:aspect-[4/3]" : "aspect-[4/3]"
                }`}
              >
                <Image
                  src={g.src}
                  alt={g.alt}
                  fill
                  className="object-cover"
                  sizes={index === 0 ? "(max-width: 640px) calc(100vw - 24px), 33vw" : "(max-width: 640px) 46vw, 33vw"}
                />
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
