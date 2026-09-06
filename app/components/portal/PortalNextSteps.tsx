import Link from "next/link";
import { ArrowRight, FileText, MessageSquare, Store, Package } from "lucide-react";

export default function PortalNextSteps({ hasPharmacy, readyForPickup }: { hasPharmacy: boolean; readyForPickup: number }) {
  const actions = hasPharmacy ? [
    { href: "/portal/prescriptions", title: "Send a prescription", description: "Upload your prescription for your pharmacist to review.", Icon: FileText },
    { href: readyForPickup > 0 ? "/portal/refills" : "/portal/orders", title: readyForPickup > 0 ? `${readyForPickup} refill${readyForPickup === 1 ? " is" : "s are"} ready` : "Track my requests", description: readyForPickup > 0 ? "Open your refill to check collection details." : "Check your order status and payment details.", Icon: Package },
    { href: "/portal/messages", title: "Ask my pharmacist", description: "Send a question and see replies from your pharmacy.", Icon: MessageSquare },
  ] : [
    { href: "/portal/pharmacies", title: "Choose your pharmacy", description: "Connect to a pharmacy before sending prescriptions, requesting refills, or messaging its team.", Icon: Store },
  ];
  return <section aria-labelledby="portal-next-title" className="mb-6">
    <h2 id="portal-next-title" className="mb-3 text-lg font-semibold text-[#0c1a14]">{hasPharmacy ? "What would you like to do?" : "Start here"}</h2>
    <div className={`grid gap-3 ${hasPharmacy ? "md:grid-cols-3" : ""}`}>
      {actions.map(({ href, title, description, Icon }) => <Link key={href} href={href} className="group rounded-2xl border border-[#cfe4da] bg-white p-4 transition hover:border-[#0d6e5a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d6e5a]">
        <Icon className="mb-3 h-5 w-5 text-[#0d6e5a]" aria-hidden />
        <h3 className="flex items-center justify-between gap-2 font-semibold text-[#0c1a14]">{title}<ArrowRight className="h-4 w-4 shrink-0 text-[#0d6e5a]" aria-hidden /></h3>
        <p className="mt-1 text-sm leading-6 text-[#5a6b62]">{description}</p>
      </Link>)}
    </div>
  </section>;
}
