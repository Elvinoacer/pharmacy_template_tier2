import Link from "next/link";
import { MapPin, ShieldCheck, Stethoscope, ArrowRight, Building2, Search } from "lucide-react";
import { listMarketplacePharmacies } from "@/app/lib/tenant";
import { platform } from "@/app/lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${platform.name} — ${platform.tagline}`,
  description: platform.description,
};

function statusChip(p: { featured: boolean }) {
  if (p.featured) return "Featured partner";
  return "Verified pharmacy";
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const city = (sp.city || "").trim();
  const pharmacies = await listMarketplacePharmacies({ q: q || undefined, city: city || undefined });

  const cities = Array.from(new Set(pharmacies.map((p) => p.city).filter(Boolean))) as string[];

  return (
    <div>
      <section className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-6 sm:pb-20 sm:pt-36">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 20% 30%, rgba(45,212,191,0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 20%, rgba(201,162,39,0.12) 0%, transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-800/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#084c3f] shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Licensed pharmacies · one patient account
          </p>
          <h1
            className="max-w-3xl text-4xl font-bold leading-[1.12] tracking-tight text-[#0c1a14] sm:text-5xl lg:text-[3.4rem]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Care from a pharmacy{" "}
            <span className="gradient-text font-extrabold">you can walk to</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#4b5d55] sm:text-lg">
            {platform.description} Search the network, visit a storefront, and keep your
            prescriptions, refills, and loyalty in one portal.
          </p>

          <form
            action="/"
            className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-stretch"
          >
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8b84]" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Pharmacy, city, or county"
                className="h-12 w-full rounded-2xl border border-teal-900/10 bg-white pl-10 pr-4 text-sm text-[#0c1a14] shadow-sm outline-none ring-[#0d6e5a]/20 focus:ring-2"
              />
            </label>
            <button type="submit" className="btn-primary h-12 px-6">
              Find a pharmacy
            </button>
          </form>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/for-pharmacies" className="btn-ghost">
              Join as a pharmacy
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/register" className="btn-ghost">
              Create a patient account
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2
                className="text-2xl font-semibold text-[#0c1a14] sm:text-3xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Pharmacies on Aether
              </h2>
              <p className="mt-1 text-sm text-[#5a6b62]">
                {pharmacies.length === 0
                  ? "No listed pharmacies match that search yet."
                  : `${pharmacies.length} verified ${pharmacies.length === 1 ? "pharmacy" : "pharmacies"} accepting patients.`}
              </p>
            </div>
            {cities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {cities.slice(0, 8).map((c) => (
                  <Link
                    key={c}
                    href={`/?city=${encodeURIComponent(c)}`}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      city === c
                        ? "border-teal-800/20 bg-teal-50 text-[#084c3f]"
                        : "border-teal-900/10 bg-white text-[#5a6b62]"
                    }`}
                  >
                    {c}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {pharmacies.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-teal-900/15 bg-white/70 px-6 py-16 text-center">
              <Building2 className="mx-auto h-10 w-10 text-teal-800/40" />
              <p className="mt-4 text-sm text-[#5a6b62]">
                The directory fills as pharmacies are verified.{" "}
                <Link href="/for-pharmacies" className="font-semibold text-[#0d6e5a] hover:underline">
                  Apply to join the network
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {pharmacies.map((p) => (
                <Link
                  key={p.id}
                  href={`/p/${p.slug}`}
                  className="group flex flex-col rounded-3xl border border-teal-900/8 bg-white p-5 shadow-[0_10px_40px_rgba(8,40,32,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_50px_rgba(8,40,32,0.1)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-lg font-bold text-teal-50">
                      {p.name.slice(0, 1)}
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                      {statusChip(p)}
                    </span>
                  </div>
                  <h3
                    className="mt-4 text-xl font-semibold text-[#0c1a14] group-hover:text-[#0d6e5a]"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {p.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#5a6b62]">
                    {p.tagline || p.description || "Neighbourhood pharmacy on the Aether network."}
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-[#084c3f]">
                    <MapPin className="h-3.5 w-3.5" />
                    {[p.city, p.county].filter(Boolean).join(", ") || p.country}
                  </div>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#0d6e5a]">
                    Visit storefront
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-teal-900/5 bg-white/60 px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Verified licences",
              body: "Every live pharmacy is reviewed by the network team — PPB premises, contact, and location — before patients can find them.",
            },
            {
              icon: Stethoscope,
              title: "One clinical record per shop",
              body: "Prescriptions, refills, and counselling stay with the pharmacy that dispensed them. Your account works across the network.",
            },
            {
              icon: Building2,
              title: "Built for independent pharmacies",
              body: "Keep your own brand, hours, M-Pesa, and staff. The platform is the rails — not a white-label takeover.",
            },
          ].map((card) => (
            <div key={card.title} className="rounded-3xl border border-teal-900/8 bg-white p-6">
              <card.icon className="h-6 w-6 text-[#0d6e5a]" />
              <h3 className="mt-4 text-lg font-semibold text-[#0c1a14]">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5a6b62]">{card.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
