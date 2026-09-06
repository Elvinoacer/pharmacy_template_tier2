import Link from "next/link";
import { ArrowUpRight, MapPin, ClipboardList, HeartPulse } from "lucide-react";

const journeys = [
  { step: "01", title: "Find your pharmacy", description: "Search your neighbourhood, compare services, and choose where to get care.", href: "/pharmacies", label: "Explore pharmacies", Icon: MapPin },
  { step: "02", title: "Keep your care together", description: "Sign in to follow your requests and manage care with your pharmacy.", href: "/portal", label: "Open my care", Icon: ClipboardList },
  { step: "03", title: "Understand your health", description: "Explore practical guides and prepare questions for your pharmacist.", href: "/health", label: "Read health guides", Icon: HeartPulse },
];

export default function CarePathways() {
  return <section className="care-pathways px-4 py-12 sm:px-6 sm:py-20" aria-labelledby="care-pathways-title">
    <div className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-[var(--brand)]">Your next step, made simple</p><h2 id="care-pathways-title" className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>What brings you here today?</h2></div>
        <p className="max-w-sm text-sm leading-relaxed text-[var(--muted)]">For a refill or booking, choose a pharmacy first. You can browse without an account. Sign in when you’re ready to manage your care.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">{journeys.map(({ step, title, description, href, label, Icon }, index) => <Link key={step} href={href} className={`care-pathway group ${index === 0 ? "care-pathway-featured" : ""}`}>
        <div className="flex items-center justify-between"><span className="care-pathway-icon"><Icon size={22} aria-hidden="true" /></span><span className="text-xs font-medium text-[var(--muted)]">{step}</span></div>
        <h3 className="mt-6 text-xl font-semibold">{title}</h3><p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted)]">{description}</p>
        <span className="mt-7 flex items-center justify-between gap-3 text-sm font-semibold text-[var(--brand)]">{label}<ArrowUpRight size={18} aria-hidden="true" /></span>
      </Link>)}</div>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[var(--border)] pt-5 text-sm">
        <span className="text-[var(--muted)]">Work at a pharmacy?</span>
        <Link href="/login?next=%2Fadmin" className="inline-flex min-h-11 items-center font-semibold text-[var(--brand)] hover:underline">Open your pharmacy workspace →</Link>
        <Link href="/for-pharmacies" className="inline-flex min-h-11 items-center font-semibold text-[var(--brand)] hover:underline">Register your pharmacy →</Link>
      </div>
    </div>
  </section>;
}
