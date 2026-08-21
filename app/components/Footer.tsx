import Link from "next/link";
import { pharmacy } from "../lib/data";

const QUICK = [
  { href: "/about", label: "About us" },
  { href: "/services", label: "Services" },
  { href: "/health/counselling", label: "Medication counselling" },
  { href: "/vaccinations", label: "Vaccinations" },
  { href: "/preventive", label: "Preventive health" },
  { href: "/health", label: "Health library" },
  { href: "/health/self-care-guide", label: "Self-care & triage guide" },
  { href: "/faq", label: "FAQ" },
  { href: "/careers", label: "Careers" },
];

const ACTIONS = [
  { href: "/refill", label: "Request a refill" },
  { href: "/how-do-you-feel", label: "How do you feel?" },
  { href: "/delivery", label: "Delivery enquiry" },
  { href: "/contact", label: "Contact us" },
  { href: "/medicines", label: "OTC Medicines" },
  { href: "/vaccinations", label: "Book a vaccine" },
  { href: "/search", label: "Search" },
];

export default function Footer() {
  return (
    <footer className="border-t border-teal-900/5 bg-white/70 px-4 py-14 backdrop-blur sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 3c-1.5 3.5-4 5.5-7.5 6.5C8 10.5 10.5 12.5 12 16c1.5-3.5 4-5.5 7.5-6.5C16 8.5 13.5 6.5 12 3Z"
                  fill="#5eead4"
                />
              </svg>
            </span>
            <span
              className="text-lg font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {pharmacy.name}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#5a6b62]">
            {pharmacy.tagline}. Expert dispensing, personal care, and convenient services for your neighbourhood.
          </p>
          <div className="mt-4 flex gap-3">
            {[
              {
                href: pharmacy.social.facebook,
                label: "Facebook",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                  </svg>
                )
              },
              {
                href: pharmacy.social.instagram,
                label: "Instagram",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                )
              },
              {
                href: pharmacy.social.linkedin,
                label: "LinkedIn",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                    <rect x="2" y="9" width="4" height="12"></rect>
                    <circle cx="4" cy="4" r="2"></circle>
                  </svg>
                )
              },
              {
                href: pharmacy.whatsappHref,
                label: "WhatsApp",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                )
              },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-teal-900/10 bg-white text-[#084c3f] transition hover:border-teal-700/30 hover:bg-teal-50"
                aria-label={s.label}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#0c1a14]">Explore</p>
          <ul className="mt-3 space-y-2 text-sm text-[#5a6b62]">
            {QUICK.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-teal-800">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#0c1a14]">Quick actions</p>
          <ul className="mt-3 space-y-2 text-sm text-[#5a6b62]">
            {ACTIONS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-teal-800">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#0c1a14]">Visit us</p>
          <ul className="mt-3 space-y-2 text-sm text-[#5a6b62]">
            <li>{pharmacy.address.full}</li>
            <li>
              <a href={pharmacy.phoneHref} className="hover:text-teal-800">
                {pharmacy.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${pharmacy.email}`} className="hover:text-teal-800">
                {pharmacy.email}
              </a>
            </li>
          </ul>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#0c1a14]">Hours</p>
          <ul className="mt-2 space-y-1 text-sm text-[#5a6b62]">
            {pharmacy.hours.map((h) => (
              <li key={h.day} className="flex justify-between gap-3">
                <span>{h.day}</span>
                <span className="text-right font-medium text-[#3d4f46]">{h.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-6xl border-t border-teal-900/5 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#5a6b62]/70">
            © {new Date().getFullYear()} {pharmacy.name}. All rights reserved. Demo site with stock imagery via Unsplash.
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
          <strong className="font-semibold text-[#3d4f46]">Important:</strong> Information on this website is for general
          education only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult
          a licensed pharmacist or physician for decisions about your health. In an emergency, call 911.
        </p>
      </div>
    </footer>
  );
}
