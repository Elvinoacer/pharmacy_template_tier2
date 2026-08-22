import Link from "next/link";
import BrandMark from "@/app/components/BrandMark";
import { platform } from "@/app/lib/data";
import type { PublicBrand } from "@/app/lib/brand";

const PLATFORM_EXPLORE = [
  { href: "/about", label: "About the network" },
  { href: "/for-pharmacies", label: "For pharmacies" },
  { href: "/onboard", label: "Join as a pharmacy" },
  { href: "/health", label: "Health library" },
  { href: "/health/self-care-guide", label: "Self-care & triage" },
  { href: "/health/counselling", label: "Medication counselling" },
];

const PLATFORM_ACTIONS = [
  { href: "/register", label: "Create a patient account" },
  { href: "/login", label: "Sign in" },
  { href: "/#pharmacies", label: "Find a pharmacy" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

const STOREFRONT_QUICK = [
  { href: "/about", label: "About us" },
  { href: "/services", label: "Services" },
  { href: "/health/counselling", label: "Medication counselling" },
  { href: "/vaccinations", label: "Vaccinations" },
  { href: "/preventive", label: "Preventive health" },
  { href: "/health", label: "Health library" },
  { href: "/faq", label: "FAQ" },
  { href: "/careers", label: "Careers" },
];

const STOREFRONT_ACTIONS = [
  { href: "/refill", label: "Request a refill" },
  { href: "/how-do-you-feel", label: "How do you feel?" },
  { href: "/delivery", label: "Delivery enquiry" },
  { href: "/contact", label: "Contact us" },
  { href: "/medicines", label: "OTC Medicines" },
  { href: "/vaccinations", label: "Book a vaccine" },
];

function prefix(href: string, slug: string | null, storefront: boolean) {
  if (!storefront || !slug) return href;
  if (href.startsWith("http") || href.startsWith("tel") || href.startsWith("mailto") || href.startsWith("#")) {
    return href;
  }
  const [path, q] = href.split("?");
  const prefixed = path === "/" ? `/p/${slug}` : `/p/${slug}${path}`;
  return q ? `${prefixed}?${q}` : prefixed;
}

export default function Footer({
  surface = "platform",
  brand,
}: {
  surface?: "platform" | "storefront";
  brand?: PublicBrand | null;
}) {
  const storefront = surface === "storefront" && Boolean(brand?.slug);
  const slug = brand?.slug ?? null;
  const withBase = (href: string) => prefix(href, slug, storefront);
  const explore = storefront ? STOREFRONT_QUICK : PLATFORM_EXPLORE;
  const actions = storefront ? STOREFRONT_ACTIONS : PLATFORM_ACTIONS;
  const name = storefront && brand ? brand.name : platform.legalName;
  const tagline = storefront && brand ? brand.tagline : platform.tagline;
  const phone = storefront && brand?.phone ? brand.phone : platform.phone;
  const phoneHref = storefront && brand?.phoneHref ? brand.phoneHref : platform.phoneHref;
  const email = storefront && brand?.email ? brand.email : platform.email;
  const address = storefront && brand?.addressFull ? brand.addressFull : "Licensed pharmacies across Kenya";
  const hours = storefront ? brand?.hours ?? [] : [];
  const socialHref = (key: "facebook" | "instagram" | "linkedin") => platform.social[key];

  return (
    <footer className="border-t border-teal-900/5 bg-white/70 px-4 py-14 backdrop-blur sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f]">
              <BrandMark size={18} />
            </span>
            <span
              className="text-lg font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {storefront && brand ? brand.name : platform.name}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#5a6b62]">
            {tagline}. {storefront ? "Expert dispensing and personal care at this pharmacy." : platform.promise}
          </p>
          <div className="mt-4 flex gap-3">
            {[
              { href: socialHref("facebook"), label: "Facebook" },
              { href: socialHref("instagram"), label: "Instagram" },
              { href: socialHref("linkedin"), label: "LinkedIn" },
              { href: storefront && brand?.whatsappHref ? brand.whatsappHref : platform.whatsappHref, label: "WhatsApp" },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-teal-900/10 bg-white text-[10px] font-bold text-[#084c3f] transition hover:border-teal-700/30 hover:bg-teal-50"
                aria-label={s.label}
              >
                {s.label.slice(0, 2)}
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#0c1a14]">Explore</p>
          <ul className="mt-3 space-y-2 text-sm text-[#5a6b62]">
            {explore.map((l) => (
              <li key={l.href}>
                <Link href={withBase(l.href)} className="hover:text-teal-800">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#0c1a14]">
            {storefront ? "Quick actions" : "Get started"}
          </p>
          <ul className="mt-3 space-y-2 text-sm text-[#5a6b62]">
            {actions.map((l) => (
              <li key={l.href}>
                <Link href={withBase(l.href)} className="hover:text-teal-800">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#0c1a14]">
            {storefront ? "Visit us" : "Network"}
          </p>
          <ul className="mt-3 space-y-2 text-sm text-[#5a6b62]">
            <li>{address}</li>
            <li>
              <a href={phoneHref} className="hover:text-teal-800">
                {phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${email}`} className="hover:text-teal-800">
                {email}
              </a>
            </li>
          </ul>
          {hours.length > 0 && (
            <>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#0c1a14]">Hours</p>
              <ul className="mt-2 space-y-1 text-sm text-[#5a6b62]">
                {hours.map((h) => (
                  <li key={h.day} className="flex justify-between gap-3">
                    <span>{h.day}</span>
                    <span className="text-right font-medium text-[#3d4f46]">{h.time}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-6xl border-t border-teal-900/5 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#5a6b62]/70">
            © {new Date().getFullYear()} {name}. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-[#5a6b62]">
            <Link href="/privacy" className="hover:text-teal-800">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-teal-800">
              Terms of Service
            </Link>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-[#5a6b62]/80">
          <strong className="font-semibold text-[#3d4f46]">Important:</strong> Information on this website is for
          general education only and is not a substitute for professional medical advice, diagnosis, or treatment.
          Always consult a licensed pharmacist or physician for decisions about your health. In an emergency in
          Kenya, call {platform.emergency} or {platform.emergencyAlt}.
        </p>
      </div>
    </footer>
  );
}
