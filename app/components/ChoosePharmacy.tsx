import Link from "next/link";
import { ArrowRight, Building2, MapPin, ShieldCheck } from "lucide-react";
import { listMarketplacePharmacies } from "@/app/lib/tenant";
import { platform } from "@/app/lib/data";

/**
 * Shown on shop-only public pages (refill, medicines, bookings, contact…)
 * when no pharmacy tenant is in context. Never silently fall back to the
 * demo shop — that was the old single-tenant leak.
 */
export default async function ChoosePharmacy({
  next = "/",
  title = "Choose your pharmacy first",
  description = "Refills, bookings, and the medicine counter belong to a specific licensed pharmacy. Pick one on the network to continue.",
}: {
  next?: string;
  title?: string;
  description?: string;
}) {
  const pharmacies = await listMarketplacePharmacies();
  const dest = next.startsWith("/") ? next : `/${next}`;

  return (
    <div>
      <section className="relative overflow-hidden px-4 pb-12 pt-32 sm:px-6 sm:pt-36">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 15% 0%, rgba(13,110,90,0.14), transparent 55%)",
          }}
        />
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#0d6e5a]">
            {platform.name} network
          </p>
          <h1
            className="mt-3 text-3xl font-semibold tracking-tight text-[#0c1a14] sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#5a6b62] sm:text-base">
            {description}
          </p>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          {pharmacies.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-teal-900/15 bg-white/80 px-6 py-16 text-center">
              <Building2 className="mx-auto h-10 w-10 text-teal-800/40" />
              <p className="mt-4 text-sm text-[#5a6b62]">
                No pharmacies are listed yet.{" "}
                <Link href="/for-pharmacies" className="font-semibold text-[#0d6e5a] hover:underline">
                  Join as a pharmacy
                </Link>{" "}
                or{" "}
                <Link href="/" className="font-semibold text-[#0d6e5a] hover:underline">
                  return home
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pharmacies.map((p) => {
                const href = dest === "/" ? `/p/${p.slug}` : `/p/${p.slug}${dest}`;
                return (
                  <Link
                    key={p.id}
                    href={href}
                    className="group flex flex-col rounded-[1.5rem] border border-teal-900/8 bg-white p-5 shadow-[0_10px_40px_rgba(8,40,32,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgba(8,40,32,0.1)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0d6e5a] text-sm font-bold text-teal-50">
                        {p.name.slice(0, 1)}
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                        <ShieldCheck className="h-3 w-3" />
                        {p.featured ? "Featured" : "Verified"}
                      </span>
                    </div>
                    <h2
                      className="mt-4 text-lg font-semibold text-[#0c1a14] group-hover:text-[#0d6e5a]"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {p.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-[#5a6b62]">
                      {p.tagline || "Neighbourhood pharmacy on the Aether network."}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#084c3f]">
                      <MapPin className="h-3.5 w-3.5" />
                      {[p.city, p.county].filter(Boolean).join(", ") || "Kenya"}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#0d6e5a]">
                      Continue here
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
