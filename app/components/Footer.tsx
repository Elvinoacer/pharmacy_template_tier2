import Link from "next/link";
import BrandMark from "@/app/components/BrandMark";
import { platform } from "@/app/lib/data";
import type { PublicBrand } from "@/app/lib/brand";
import { Facebook, Instagram, Linkedin, MessageCircle } from "lucide-react";

const PLATFORM_EXPLORE = [{ href: "/about", label: "About the network" },{ href: "/for-pharmacies", label: "For pharmacies" },{ href: "/onboard", label: "Join as a pharmacy" },{ href: "/health", label: "Health library" },{ href: "/health/self-care-guide", label: "Self-care & triage" },{ href: "/health/counselling", label: "Medication counselling" }];
const PLATFORM_ACTIONS = [{ href: "/register", label: "Create a patient account" },{ href: "/login", label: "Sign in" },{ href: "/pharmacies", label: "Find a pharmacy" },{ href: "/privacy", label: "Privacy" },{ href: "/terms", label: "Terms" }];
const STOREFRONT_QUICK = [{ href: "/about", label: "About us" },{ href: "/services", label: "Services" },{ href: "/health/counselling", label: "Medication counselling" },{ href: "/vaccinations", label: "Vaccinations" },{ href: "/preventive", label: "Preventive health" },{ href: "/health", label: "Health library" },{ href: "/faq", label: "FAQ" },{ href: "/careers", label: "Careers" }];
const STOREFRONT_ACTIONS = [{ href: "/refill", label: "Request a refill" },{ href: "/how-do-you-feel", label: "How do you feel?" },{ href: "/delivery", label: "Delivery enquiry" },{ href: "/contact", label: "Contact us" },{ href: "/medicines", label: "OTC Medicines" },{ href: "/vaccinations", label: "Book a vaccine" }];

function prefix(href: string, slug: string | null, storefront: boolean) {
  if (!storefront || !slug || href.startsWith("http") || href.startsWith("tel") || href.startsWith("mailto") || href.startsWith("#")) return href;
  const [path, q] = href.split("?"); const prefixed = path === "/" ? `/p/${slug}` : `/p/${slug}${path}`; return q ? `${prefixed}?${q}` : prefixed;
}

export default function Footer({ surface = "platform", brand }: { surface?: "platform" | "storefront"; brand?: PublicBrand | null; }) {
  const storefront = surface === "storefront" && Boolean(brand?.slug); const slug = brand?.slug ?? null; const withBase = (href: string) => prefix(href, slug, storefront);
  const explore = storefront ? STOREFRONT_QUICK : PLATFORM_EXPLORE; const actions = storefront ? STOREFRONT_ACTIONS : PLATFORM_ACTIONS;
  const name = storefront && brand ? brand.name : platform.legalName; const tagline = storefront && brand ? brand.tagline : platform.tagline;
  const phone = storefront && brand?.phone ? brand.phone : platform.phone; const phoneHref = storefront && brand?.phoneHref ? brand.phoneHref : platform.phoneHref;
  const email = storefront && brand?.email ? brand.email : platform.email; const address = storefront && brand?.addressFull ? brand.addressFull : "Licensed pharmacies across Kenya"; const hours = storefront ? brand?.hours ?? [] : [];
  const socialHref = (key: "facebook" | "instagram" | "linkedin") => platform.social[key];
  const socialLinks = [
    { href: socialHref("facebook"), label: "Facebook", Icon: Facebook },
    { href: socialHref("instagram"), label: "Instagram", Icon: Instagram },
    { href: socialHref("linkedin"), label: "LinkedIn", Icon: Linkedin },
    { href: storefront && brand?.whatsappHref ? brand.whatsappHref : platform.whatsappHref, label: "WhatsApp", Icon: MessageCircle },
  ];

  return <footer className="border-t border-teal-900/5 bg-white/80 px-4 py-10 backdrop-blur sm:px-6 sm:py-14">
    <div className="mx-auto grid max-w-6xl gap-9 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-10 lg:grid-cols-4">
      <div className="sm:col-span-2 lg:col-span-1"><div className="flex items-center gap-2.5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f]"><BrandMark size={19} /></span><span className="text-xl font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>{storefront && brand ? brand.name : platform.name}</span></div><p className="mt-3 max-w-md text-sm leading-6 text-[#5a6b62]">{tagline}. {storefront ? "Expert dispensing and personal care at this pharmacy." : platform.promise}</p><div className="mt-5 flex flex-wrap gap-3">{socialLinks.map(({ href, label, Icon }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-900/10 bg-white text-[#0b5f50] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-700/25 hover:bg-teal-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d6e5a] focus-visible:ring-offset-2 active:translate-y-0 active:scale-95"><Icon aria-hidden="true" className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" strokeWidth={1.9} /></a>)}</div></div>
      <FooterColumn title="Explore" links={explore} withBase={withBase} />
      <FooterColumn title={storefront ? "Quick actions" : "Get started"} links={actions} withBase={withBase} />
      <div><p className="text-xs font-bold uppercase tracking-wider text-[#0c1a14]">{storefront ? "Visit us" : "Network"}</p><ul className="mt-4 space-y-3 text-sm leading-6 text-[#5a6b62]"><li>{address}</li><li><a href={phoneHref} className="inline-flex min-h-11 items-center hover:text-teal-800">{phone}</a></li><li><a href={`mailto:${email}`} className="inline-flex min-h-11 items-center break-all hover:text-teal-800">{email}</a></li></ul>{hours.length > 0 && <><p className="mt-5 text-xs font-bold uppercase tracking-wider text-[#0c1a14]">Hours</p><ul className="mt-3 space-y-2 text-sm text-[#5a6b62]">{hours.map((h) => <li key={h.day} className="flex justify-between gap-3"><span>{h.day}</span><span className="text-right font-medium text-[#3d4f46]">{h.time}</span></li>)}</ul></>}</div>
    </div>
    <div className="mx-auto mt-10 max-w-6xl border-t border-teal-900/5 pt-6 sm:mt-12"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-[#5a6b62]/70">© {new Date().getFullYear()} {name}. All rights reserved.</p><div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#5a6b62]"><Link href="/privacy" className="inline-flex min-h-10 items-center hover:text-teal-800">Privacy Policy</Link><Link href="/terms" className="inline-flex min-h-10 items-center hover:text-teal-800">Terms of Service</Link></div></div><p className="mt-4 text-xs leading-5 text-[#5a6b62]/80"><strong className="font-semibold text-[#3d4f46]">Important:</strong> Information on this website is for general education only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a licensed pharmacist or physician for decisions about your health. In an emergency in Kenya, call {platform.emergency} or {platform.emergencyAlt}.</p></div>
  </footer>;
}

function FooterColumn({ title, links, withBase }: { title: string; links: { href: string; label: string }[]; withBase: (href: string) => string }) { return <div><p className="text-xs font-bold uppercase tracking-wider text-[#0c1a14]">{title}</p><ul className="mt-3 space-y-1 text-sm text-[#5a6b62]">{links.map((l) => <li key={l.href}><Link href={withBase(l.href)} className="flex min-h-11 items-center rounded-lg py-1 leading-5 transition hover:text-teal-800">{l.label}</Link></li>)}</ul></div>; }
