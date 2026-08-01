import type { Metadata } from "next";
import Image from "next/image";
import CtaBanner from "../components/CtaBanner";
import PageHero from "../components/PageHero";
import Reveal from "../components/Reveal";
import { gallery, pharmacy, team, values } from "../lib/data";

export const metadata: Metadata = {
  title: "About Us",
  description: `Learn about ${pharmacy.name} — our story, mission, values, and the pharmacists who care for Austin families.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div>
      <PageHero
        eyebrow="About us"
        title="A neighbourhood pharmacy built on trust"
        description="For more than fifteen years, Aether has combined careful dispensing with personal attention — because health decisions deserve both expertise and kindness."
        crumbs={[{ label: "About" }]}
      />

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-xl">
              <Image
                src="/images/gallery/welcoming_retail_floor.webp"
                alt="Aether Pharmacy interior"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Our story</p>
              <h2
                className="mt-2 text-2xl font-semibold text-[#0c1a14] sm:text-3xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                From a single counter to a trusted community hub
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-[#5a6b62] sm:text-base">
                <p>
                  Aether Pharmacy opened its doors with a simple promise: every prescription would be
                  checked carefully, every question answered clearly, and every neighbour treated like family.
                </p>
                <p>
                  Today we serve thousands of patients each year with dispensing, vaccinations, health
                  screenings, delivery, and medication counselling — still independent, still local, still
                  focused on the person at the counter.
                </p>
                <p>
                  Our lead pharmacist, Dr. Priya Nair, continues to set the clinical standard while a
                  dedicated team keeps care accessible through phone, WhatsApp, walk-ins, and home delivery.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="px-4 py-8 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Mission</p>
            <p
              className="mt-3 text-xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Make safe, understandable pharmacy care easy to access for every neighbour we serve.
            </p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Vision</p>
            <p
              className="mt-3 text-xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              A healthier community where no one feels lost navigating medications, insurance, or wellness.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Core values</p>
          <h2
            className="mt-2 text-3xl font-semibold text-[#0c1a14]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            What guides our work
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm"
              >
                <h3 className="font-semibold text-[#0c1a14]">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5a6b62]">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Our team</p>
          <h2
            className="mt-2 text-3xl font-semibold text-[#0c1a14]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Meet the people behind the counter
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member) => (
              <article
                key={member.id}
                className="overflow-hidden rounded-3xl border border-white/60 bg-white shadow-sm"
              >
                <div className="relative h-56">
                  <Image
                    src={member.photo}
                    alt={member.name}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                </div>
                <div className="p-5">
                  <h3
                    className="text-lg font-semibold text-[#0c1a14]"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {member.name}
                  </h3>
                  <p className="mt-0.5 text-sm font-medium text-teal-800">{member.role}</p>
                  <p className="mt-3 text-sm leading-relaxed text-[#5a6b62]">{member.bio}</p>
                  <p className="mt-3 text-xs text-[#5a6b62]/80">{member.qualifications}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications + community */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-sm">
            <h2
              className="text-xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Certifications & standards
            </h2>
            <ul className="mt-5 space-y-3">
              {pharmacy.certifications.map((c) => (
                <li key={c} className="flex items-center gap-3 text-sm text-[#0c1a14]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-teal-800">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-sm">
            <h2
              className="text-xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Community involvement
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#5a6b62]">
              We host seasonal flu clinics, partner with local schools on medicine-safety talks, support
              neighbourhood health fairs, and offer free blood pressure checks year-round. If your organisation
              needs a pharmacist speaker or screening day, we would love to help.
            </p>
            <a href="/contact" className="mt-5 inline-block text-sm font-semibold text-teal-800 hover:underline">
              Partner with us →
            </a>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="px-4 pb-8 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2
            className="text-2xl font-semibold text-[#0c1a14]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Our space
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {gallery.map((g) => (
              <div key={g.src} className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                <Image src={g.src} alt={g.alt} fill className="object-cover" sizes="33vw" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner title="Come say hello" description="Walk in anytime during open hours — or reach us by phone and WhatsApp." />
    </div>
  );
}
