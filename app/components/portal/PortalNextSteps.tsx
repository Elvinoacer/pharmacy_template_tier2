import Link from "next/link";
import { ArrowRight, Pill, CalendarDays, Package } from "lucide-react";
export default function PortalNextSteps({ readyForPickup }: { readyForPickup: number }) {
  const actions = [
    { href: "/medicines", title: "Find medicine", description: "Availability, prices and nearby care.", Icon: Pill },
    { href: "/services", title: "Book a service", description: "Choose the care you need.", Icon: CalendarDays },
    { href: readyForPickup ? "/portal/refills" : "/portal/orders", title: readyForPickup ? `${readyForPickup} ready for collection` : "Track requests", description: "Updates and payments in one place.", Icon: Package },
  ];
  return <section aria-label="Your next step" className="mb-6 grid gap-3 md:grid-cols-3">{actions.map(({ href, title, description, Icon }) => <Link key={href} href={href} className="group rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-5 transition hover:border-[var(--brand)]"><Icon className="mb-4 h-5 w-5 text-[var(--brand)]" aria-hidden /><h2 className="flex items-center justify-between font-semibold">{title}<ArrowRight size={16} aria-hidden /></h2><p className="mt-1 text-sm text-[var(--muted)]">{description}</p></Link>)}</section>;
}
