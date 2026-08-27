"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  ChevronRight,
  Clock,
  Facebook,
  FileText,
  Globe,
  Headphones,
  Heart,
  HeartPulse,
  Info,
  Instagram,
  Linkedin,
  Lock,
  LogIn,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  PlusSquare,
  ShieldCheck,
  Truck,
  UserPlus,
} from "lucide-react";
import BrandMark from "@/app/components/BrandMark";
import { platform } from "@/app/lib/data";
import type { PublicBrand } from "@/app/lib/brand";

interface FooterProps {
  surface?: "platform" | "storefront";
  brand?: PublicBrand | null;
  clearMobileActionBar?: boolean;
}

const PLATFORM_EXPLORE = [
  { href: "/about", label: "About the network", icon: Info },
  { href: "/for-pharmacies", label: "For pharmacies", icon: Building2 },
  { href: "/onboard", label: "Join as a pharmacy", icon: PlusSquare },
  { href: "/health", label: "Health library", icon: BookOpen },
  { href: "/health/self-care-guide", label: "Self-care & triage", icon: HeartPulse },
  { href: "/health/counselling", label: "Medication counselling", icon: MessageSquare },
];

const PLATFORM_ACTIONS = [
  { href: "/register", label: "Create a patient account", icon: UserPlus },
  { href: "/login", label: "Sign in", icon: LogIn },
  { href: "/pharmacies", label: "Find a pharmacy", icon: MapPin },
  { href: "/privacy", label: "Privacy", icon: ShieldCheck },
  { href: "/terms", label: "Terms", icon: FileText },
];

const STOREFRONT_EXPLORE = [
  { href: "/about", label: "About this pharmacy", icon: Info },
  { href: "/services", label: "Pharmacy Services", icon: Building2 },
  { href: "/vaccinations", label: "Vaccinations", icon: PlusSquare },
  { href: "/health", label: "Health Library", icon: BookOpen },
  { href: "/health/self-care-guide", label: "Self-Care & Triage", icon: HeartPulse },
  { href: "/health/counselling", label: "Medication Counselling", icon: MessageSquare },
];

const STOREFRONT_ACTIONS = [
  { href: "/refill", label: "Request a Refill", icon: PlusSquare },
  { href: "/how-do-you-feel", label: "How Do You Feel?", icon: HeartPulse },
  { href: "/order", label: "Order OTC Medicines", icon: MapPin },
  { href: "/privacy", label: "Privacy Policy", icon: ShieldCheck },
  { href: "/terms", label: "Terms of Service", icon: FileText },
];

function prefix(href: string, slug: string | null, storefront: boolean) {
  if (
    !storefront ||
    !slug ||
    href.startsWith("http") ||
    href.startsWith("tel") ||
    href.startsWith("mailto") ||
    href.startsWith("#")
  ) {
    return href;
  }
  const [path, q] = href.split("?");
  const prefixed = path === "/" ? `/p/${slug}` : `/p/${slug}${path}`;
  return q ? `${prefixed}?${q}` : prefixed;
}

export default function Footer({
  surface = "platform",
  brand,
  clearMobileActionBar = false,
}: FooterProps) {
  const storefront = surface === "storefront" && Boolean(brand?.slug);
  const slug = brand?.slug ?? null;
  const withBase = (href: string) => prefix(href, slug, storefront);

  const explore = storefront ? STOREFRONT_EXPLORE : PLATFORM_EXPLORE;
  const actions = storefront ? STOREFRONT_ACTIONS : PLATFORM_ACTIONS;

  const displayName = storefront && brand ? brand.name : "Aether";
  const displaySubtitle = storefront ? slug || "Pharmacy" : "NETWORK";
  const tagline =
    storefront && brand
      ? brand.tagline
      : "The trusted pharmacy network for Kenya. Connecting communities to quality care, every day.";

  const phone = storefront && brand?.phone ? brand.phone : "+254 790 670 542";
  const phoneHref = storefront && brand?.phoneHref ? brand.phoneHref : "tel:+254790670542";
  const email = storefront && brand?.email ? brand.email : "support@gtss.software";
  const address = storefront && brand?.addressFull ? brand.addressFull : "Licensed pharmacies across Kenya";

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setSubscribed(true);
      setNewsletterEmail("");
    }
  };

  return (
    <footer
      className={`relative overflow-hidden bg-[#030907] px-4 pt-10 text-white sm:px-6 sm:pt-14 lg:px-8 ${
        clearMobileActionBar
          ? "pb-[calc(env(safe-area-inset-bottom)+7.5rem)] lg:pb-16"
          : "pb-12 sm:pb-16"
      }`}
    >
      {/* Subtle background atmospheric glows */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div className="absolute -left-32 top-10 h-[30rem] w-[30rem] rounded-full bg-emerald-600/10 blur-[150px]" />
        <div className="absolute right-0 bottom-10 h-[32rem] w-[32rem] rounded-full bg-teal-500/10 blur-[160px]" />
        <div className="landing-grain opacity-[0.05]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Large Rounded Frosted Card Container (Matches landing_page_designs/footer.png) */}
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-[#051610]/85 via-[#030e0a]/92 to-[#020806] p-7 shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-2xl sm:p-10 lg:p-12">
          
          {/* Subtle dotted Kenya silhouette overlay */}
          <div
            className="pointer-events-none absolute left-12 top-6 h-64 w-64 opacity-15"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(circle, #2dd4bf 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />

          {/* Top Section: 5 Grid Columns */}
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
            
            {/* Column 1: Brand Logo, Description, Social Icons & Directory Link Card */}
            <div className="sm:col-span-2 lg:col-span-4 xl:col-span-3">
              {/* Brand Logo & Title */}
              <Link href={storefront ? `/p/${slug}` : "/"} className="flex items-center gap-3">
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] shadow-md shadow-emerald-950/40">
                  <BrandMark size={22} />
                </span>
                <span className="flex flex-col leading-tight">
                  <span
                    className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {displayName}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#2dd4bf]">
                    {displaySubtitle}
                  </span>
                </span>
              </Link>

              {/* Tagline */}
              <p className="mt-4 max-w-[280px] text-xs leading-relaxed text-slate-300 sm:text-sm">
                {tagline}
              </p>

              {/* Trusted Badge */}
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3.5 py-1.5 text-xs text-slate-200 backdrop-blur-md">
                <ShieldCheck className="h-4 w-4 text-[#fde047]" />
                <span>
                  Trusted by <strong className="text-[#fde047]">10,000+</strong> Kenyans
                </span>
              </div>

              {/* Social Icons Row */}
              <div className="mt-5 flex items-center gap-2.5">
                {/* Facebook */}
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-slate-300 shadow-sm transition-all hover:border-emerald-400/40 hover:bg-black/70 hover:text-white"
                >
                  <Facebook className="h-4 w-4" />
                </a>

                {/* Instagram */}
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-slate-300 shadow-sm transition-all hover:border-emerald-400/40 hover:bg-black/70 hover:text-white"
                >
                  <Instagram className="h-4 w-4" />
                </a>

                {/* LinkedIn */}
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-slate-300 shadow-sm transition-all hover:border-emerald-400/40 hover:bg-black/70 hover:text-white"
                >
                  <Linkedin className="h-4 w-4" />
                </a>

                {/* WhatsApp */}
                <a
                  href="https://wa.me/254790670542?text=Hello%20Aether%20Healthcare,%20I%20have%20an%20inquiry."
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-slate-300 shadow-sm transition-all hover:border-emerald-400/40 hover:bg-black/70 hover:text-white"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              </div>

              {/* Pharmacy Network Banner Card */}
              <Link
                href="/pharmacies"
                className="group mt-6 flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 shadow-sm backdrop-blur-md transition-all hover:border-emerald-400/60 hover:bg-emerald-950/60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-900/60 text-emerald-400 shadow-sm">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">200+ licensed pharmacies</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">across Kenya</p>
                  </div>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 transition-all group-hover:bg-yellow-500 group-hover:text-black">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            </div>

            {/* Column 2: EXPLORE */}
            <div className="lg:col-span-2 xl:col-span-2">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2dd4bf]">
                Explore
              </p>
              <span className="mt-1.5 block h-0.5 w-6 rounded-full bg-[#fde047]" />

              <ul className="mt-4 space-y-2.5">
                {explore.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={withBase(item.href)}
                        className="group flex items-center justify-between rounded-xl py-1 text-xs text-slate-300 transition-all hover:text-white"
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-slate-500 transition-colors group-hover:text-emerald-400" />
                          <span>{item.label}</span>
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-500 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Column 3: GET STARTED */}
            <div className="lg:col-span-2 xl:col-span-2">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2dd4bf]">
                Get Started
              </p>
              <span className="mt-1.5 block h-0.5 w-6 rounded-full bg-[#fde047]" />

              <ul className="mt-4 space-y-2.5">
                {actions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={withBase(item.href)}
                        className="group flex items-center justify-between rounded-xl py-1 text-xs text-slate-300 transition-all hover:text-white"
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-slate-500 transition-colors group-hover:text-emerald-400" />
                          <span>{item.label}</span>
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-500 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Column 4: NETWORK */}
            <div className="lg:col-span-2 xl:col-span-2">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2dd4bf]">
                Network
              </p>
              <span className="mt-1.5 block h-0.5 w-6 rounded-full bg-[#fde047]" />

              <ul className="mt-4 space-y-3.5 text-xs text-slate-300">
                <li className="flex items-start gap-2.5">
                  <Globe className="mt-0.5 h-4 w-4 shrink-0 text-[#2dd4bf]" />
                  <span>{address}</span>
                </li>
                <li>
                  <a
                    href={phoneHref}
                    className="flex items-center gap-2.5 transition hover:text-white"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-[#2dd4bf]" />
                    <span className="font-medium">{phone}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-2.5 break-all transition hover:text-white"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-[#2dd4bf]" />
                    <span className="font-medium">{email}</span>
                  </a>
                </li>
                <li className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#2dd4bf]" />
                  <div>
                    <p>Mon – Sat: 8AM – 8PM</p>
                    <p className="text-[11px] font-medium text-[#2dd4bf] mt-0.5">
                      We&apos;re here to help
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Column 5: STAY IN THE LOOP Newsletter Card */}
            <div className="sm:col-span-2 lg:col-span-4 xl:col-span-3">
              <div className="rounded-3xl border border-white/10 bg-black/40 p-5 shadow-xl backdrop-blur-xl sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2dd4bf]">
                  Stay in the loop
                </p>
                <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                  Get health tips, updates, and important news from the Aether network.
                </p>

                {subscribed ? (
                  <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/60 p-4 text-center">
                    <p className="text-xs font-bold text-emerald-300">Thank you for subscribing!</p>
                    <p className="text-[10px] text-slate-400 mt-1">We will keep you updated.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="mt-4 space-y-3">
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 pr-10 text-xs text-white placeholder:text-slate-500 shadow-inner outline-none transition-colors focus:border-emerald-400"
                      />
                      <Mail className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    </div>

                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#d4af37] via-[#c2b036] to-[#22c55e] px-6 py-3.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02] hover:brightness-110 active:scale-98"
                    >
                      <span>Subscribe</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </form>
                )}

                <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                  <Lock className="h-3 w-3 text-slate-500" />
                  <span>We respect your privacy.</span>
                </div>
              </div>
            </div>

          </div>

          {/* Middle 4-Pillar Proof Bar */}
          <div className="mt-12 rounded-2xl border border-white/10 bg-black/30 p-4 shadow-lg backdrop-blur-md sm:p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-white/10">
              
              {/* Pillar 1: Quality Assured */}
              <div className="flex items-center gap-3.5 lg:px-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white sm:text-sm">Quality Assured</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Verified pharmacies you can trust
                  </p>
                </div>
              </div>

              {/* Pillar 2: Fast & Reliable */}
              <div className="flex items-center gap-3.5 lg:px-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white sm:text-sm">Fast & Reliable</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Quick service and doorstep delivery
                  </p>
                </div>
              </div>

              {/* Pillar 3: 24/7 Support */}
              <div className="flex items-center gap-3.5 lg:px-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
                  <Headphones className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white sm:text-sm">24/7 Support</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Our team is always here to help
                  </p>
                </div>
              </div>

              {/* Pillar 4: Secure & Private */}
              <div className="flex items-center gap-3.5 lg:px-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white sm:text-sm">Secure & Private</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Your health data is protected
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Bottom Sub-Footer Bar */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row">
            <p>© {new Date().getFullYear()} Aether Pharmacy Network. All rights reserved.</p>

            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Heart className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/30" />
              <span>
                Proudly serving communities across{" "}
                <span className="font-semibold text-emerald-400">Kenya</span>
              </span>
            </div>

            <div className="flex items-center gap-5 text-xs text-slate-400">
              <Link href="/privacy" className="transition hover:text-white">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link href="/terms" className="transition hover:text-white">
                Terms of Service
              </Link>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] text-slate-300">
                Made with <span className="text-amber-300">💛</span>
              </span>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}
