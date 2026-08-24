import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, MapPin, MessageCircle, PackageCheck, Truck } from "lucide-react";
import type { DirectoryPharmacy } from "@/app/lib/services/pharmacy-directory";

interface TravelLabNetworkProps { pharmacies: DirectoryPharmacy[]; }

const FALLBACK_COVERS = [
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/curated_wellness_aisle.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/comfortable_waiting_area.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/careful_dispensing.webp",
];

export default function TravelLabNetwork({ pharmacies }: TravelLabNetworkProps) {
  return (
    <section id="network" className="relative overflow-hidden bg-white px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 border-b border-slate-100 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Featured neighbourhood pharmacies</p>
            <h2 className="mt-3 text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl" style={{ fontFamily: "var(--font-display), serif" }}>Trusted places to get care close to home.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">A small, curated selection from the Aether network. Browse the full directory when you need a pharmacy, medicine or service in a specific area.</p>
          </div>
          <Link href="/pharmacies" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800">Browse all pharmacies <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>

        {pharmacies.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><p className="text-xs text-slate-500">Featured pharmacies are being updated.</p><Link href="/pharmacies" className="mt-3 inline-block text-xs font-bold text-slate-900 hover:underline">Browse the directory →</Link></div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{pharmacies.slice(0, 6).map((pharmacy, index) => <FeaturedCard key={pharmacy.id} pharmacy={pharmacy} index={index} />)}</div>
        )}

        <div className="mt-8 flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-center sm:flex-row sm:text-left"><div><p className="text-xs font-bold text-slate-900">Looking for a specific medicine or neighbourhood?</p><p className="mt-0.5 text-[11px] text-slate-500">Search public pharmacy listings and in-stock OTC medicines.</p></div><Link href="/pharmacies" className="whitespace-nowrap text-xs font-bold text-slate-900 hover:underline">Open directory →</Link></div>
      </div>
    </section>
  );
}

function FeaturedCard({ pharmacy, index }: { pharmacy: DirectoryPharmacy; index: number }) {
  const whatsapp = pharmacy.whatsapp ? `https://wa.me/${pharmacy.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${pharmacy.name}, I found you on Aether and would like to ask about a medicine or service.`)}` : null;
  const location = [pharmacy.city, pharmacy.county].filter(Boolean).join(", ") || pharmacy.country;
  const cover = pharmacy.coverImageUrl || FALLBACK_COVERS[index % FALLBACK_COVERS.length];
  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl">
      <div className="relative h-44 overflow-hidden bg-slate-900"><Image src={cover} alt={pharmacy.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 380px" className="object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" /><div className="absolute left-4 top-4"><Badge><CheckCircle2 className="h-3 w-3" /> Featured</Badge></div><div className="absolute bottom-4 left-4 right-4 text-white"><h3 className="truncate text-base font-semibold">{pharmacy.name}</h3><p className="mt-1 flex items-center gap-1 text-[11px] text-slate-200"><MapPin className="h-3.5 w-3.5 text-amber-300" />{location}</p></div></div>
      <div className="p-5"><p className="line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">{pharmacy.tagline || pharmacy.description || "Active pharmacy on the Aether network."}</p><div className="mt-4 flex flex-wrap gap-1.5">{pharmacy.topCategories.slice(0, 3).map((category) => <span key={category} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600">{category}</span>)}{pharmacy.hasDelivery && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700"><Truck className="h-3 w-3" /> Delivery</span>}</div><div className="mt-4 flex items-center gap-2 text-[10px] font-semibold text-slate-500"><PackageCheck className="h-3.5 w-3.5" /> {pharmacy.stockCount} public items · {pharmacy.otcCount} OTC in stock</div><div className="mt-5 flex gap-2"><Link href={`/p/${pharmacy.slug}`} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800">Visit storefront <ArrowRight className="h-3.5 w-3.5" /></Link>{whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${pharmacy.name}`} className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-800 hover:bg-slate-100"><MessageCircle className="h-4 w-4" /></a>}</div></div>
    </article>
  );
}

function Badge({ children }: { children: React.ReactNode }) { return <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[9px] font-bold text-white backdrop-blur">{children}</span>; }
