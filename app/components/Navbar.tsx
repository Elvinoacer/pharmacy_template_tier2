"use client";

import ThemeToggle from "@/app/components/ThemeProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Building2,
  Camera,
  ChevronDown,
  ChevronRight,
  HeartPulse,
  HelpCircle,
  Info,
  LayoutDashboard,
  LogIn,
  Mail,
  MapPin,
  Menu,
  Phone,
  Pill,
  Search,
  RotateCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Syringe,
  Truck,
  User,
  Users,
  X,
} from "lucide-react";
import { resolvePortalCta, type PortalSessionHint } from "@/app/lib/portal-dest";
import BrandMark from "@/app/components/BrandMark";
import type { PublicBrand } from "@/app/lib/brand";

interface NavSubItem {
  href: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavCategory {
  key: string;
  label: string;
  items: NavSubItem[];
}

const STOREFRONT_CATEGORIES: NavCategory[] = [
  {
    key: "services",
    label: "Services & Meds",
    items: [
      { href: "/refill", label: "Request Refill", desc: "Fast Rx refill & status updates", icon: Pill, badge: "Fastest" },
      { href: "/medicines", label: "OTC Medicines", desc: "Browse non-prescription products", icon: ShoppingBag },
      { href: "/medicines?photo=1", label: "Photo medicine search", desc: "AI reads your pack, we match live stock", icon: Camera, badge: "New" },
      { href: "/order", label: "Order OTC Direct", desc: "Quick cart for healthcare items", icon: ShoppingBag },
      { href: "/vaccinations", label: "Vaccinations", desc: "Book flu, travel & adult vaccines", icon: Syringe, badge: "Clinic" },
      { href: "/services", label: "Pharmacy Services", desc: "Vaccinations & wellness consults", icon: Stethoscope },
      { href: "/delivery", label: "Rx Home Delivery", desc: "Same-day delivery to your doorstep", icon: Truck },
    ],
  },
  {
    key: "health",
    label: "Health & AI",
    items: [
      { href: "/how-do-you-feel", label: "How Do You Feel?", desc: "AI-powered symptom checker", icon: Sparkles, badge: "AI Tool" },
      { href: "/health/self-care-guide", label: "Self-Care vs Doctor Guide", desc: "When to self-treat vs see a clinician", icon: ShieldCheck, badge: "Triage" },
      { href: "/health", label: "Health Library", desc: "Medication guides & wellness tips", icon: HeartPulse },
      { href: "/health/counselling", label: "Patient Counselling", desc: "12-pillar digital medication guides", icon: BookOpen },
      { href: "/screenings", label: "Health Screenings & Vitals", desc: "BP, glucose, BMI & clinical referrals", icon: Activity, badge: "Screening" },
      { href: "/preventive", label: "Preventive health", desc: "Counselling, campaigns & education", icon: HeartPulse },
      { href: "/caregiver", label: "Caregiver Portal", desc: "Manage meds for family members", icon: Users },
    ],
  },
  {
    key: "company",
    label: "About & Support",
    items: [
      { href: "/about", label: "About this pharmacy", desc: "Story, team, and neighbourhood care", icon: Info },
      { href: "/faq", label: "FAQ & Help Center", desc: "Answers to common Rx questions", icon: HelpCircle },
      { href: "/careers", label: "Careers", desc: "Join this pharmacy’s team", icon: Briefcase },
    ],
  },
];

const PLATFORM_CATEGORIES: NavCategory[] = [
  {
    key: "patients",
    label: "For patients",
    items: [
      { href: "/medicines", label: "Find medicine", desc: "Compare medicine availability and prices", icon: Pill },
      { href: "/prescription", label: "Upload prescription", desc: "Find pharmacy options for your medicines", icon: Camera },
      { href: "/services", label: "Find a service", desc: "Explore care and booking options", icon: Stethoscope },
      { href: "/refill", label: "Refill medicine", desc: "Find availability for your next refill", icon: RotateCw },
      { href: "/register", label: "Patient account", desc: "One login across every Aether pharmacy", icon: User },
      { href: "/health", label: "Health library", desc: "Guides written for people, not pamphlets", icon: HeartPulse },
      { href: "/health/self-care-guide", label: "Self-care vs doctor", desc: "When to treat at home vs seek care", icon: ShieldCheck },
      { href: "/health/counselling", label: "Medication counselling", desc: "12-pillar guides for common medicines", icon: BookOpen },
    ],
  },
  {
    key: "pharmacies",
    label: "For pharmacies",
    items: [
      { href: "/for-pharmacies", label: "Why Aether", desc: "Keep your brand, licence, and M-Pesa", icon: Building2 },
      { href: "/onboard", label: "Start onboarding", desc: "Draft, submit, go live after PPB review", icon: BadgeCheck, badge: "Join" },
      { href: "/login?next=/admin", label: "Staff sign in", desc: "CRM, refills, and the pharmacy workspace", icon: LayoutDashboard },
    ],
  },
  {
    key: "about",
    label: "About",
    items: [
      { href: "/about", label: "The network", desc: "Why we exist — life and caring first", icon: Info },
      { href: "/privacy", label: "Privacy", desc: "Kenya Data Protection Act 2019", icon: ShieldCheck },
      { href: "/terms", label: "Terms", desc: "How the network and storefronts work", icon: HelpCircle },
    ],
  },
];

const CTA_ICON = {
  guest: LogIn,
  customer: User,
  caregiver: Users,
  admin: LayoutDashboard,
} as const;

export default function Navbar({
  sessionUser = null,
  pharmacySlug = null,
  surface = "platform",
  brand,
}: {
  sessionUser?: PortalSessionHint | null;
  pharmacySlug?: string | null;
  surface?: "platform" | "storefront";
  brand: PublicBrand;
}) {
  const pathname = usePathname() || "/";
  const fromPath = pathname.match(/^\/p\/([^/]+)/);
  const slug = pharmacySlug || fromPath?.[1] || brand.slug || null;
  const isPlatform = surface === "platform";
  const categories = isPlatform ? PLATFORM_CATEGORIES : STOREFRONT_CATEGORIES;

  const withBase = (href: string) => {
    if (isPlatform || !slug) return href;
    if (href.startsWith("http") || href.startsWith("tel") || href.startsWith("mailto")) return href;
    const [path, q] = href.split("?");
    const prefixed = path === "/" ? `/p/${slug}` : `/p/${slug}${path}`;
    return q ? `${prefixed}?${q}` : prefixed;
  };

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const portalCta = resolvePortalCta(sessionUser);
  const PortalIcon = CTA_ICON[portalCta.kind];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [menuPathname, setMenuPathname] = useState(pathname);
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setActiveDropdown(null);
    setMenuOpen(false);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveDropdown(null);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMouseEnter = (key: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(key);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setActiveDropdown(null), 180);
  };

  const isActive = (href: string) => {
    const target = withBase(href).split("?")[0] || "/";
    if (target === "/") return pathname === "/";
    return pathname === target || pathname.startsWith(`${target}/`);
  };

  const isCategoryActive = (cat: NavCategory) => cat.items.some((item) => isActive(item.href));

  const shortAddress = brand.addressShort;
  const isLandingPage = isPlatform && pathname === "/";
  const onDarkHero = isLandingPage && !isPlatform;
  const brandLabel = isPlatform ? "Aether" : brand.name.replace(/ Pharmacy$/i, "") || "Aether";
  const brandMeta = isPlatform ? "Network" : slug || "Pharmacy";

  const headerSurface = onDarkHero
    ? menuOpen || scrolled
      ? "border-white/12 bg-[#07120f]/92 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
      : "border-white/10 bg-white/[0.08] shadow-none backdrop-blur-md"
    : "border-[var(--glass-edge)] bg-[var(--glass-fill)] shadow-[var(--glass-shadow)] backdrop-blur-xl";

  return (
    <header
      className={`fixed inset-x-0 top-0 transition-all duration-300 ${menuOpen ? "z-[120]" : "z-50"}`}
      data-menu-open={menuOpen ? "true" : "false"}
    >
      <div
        className={`hidden text-xs transition-all duration-300 sm:block ${
          onDarkHero
            ? "bg-transparent text-teal-50/80"
            : "bg-gradient-to-r from-[#06332a] via-[#084c3f] to-[#0d6e5a] text-[#e3f2ec]"
        } ${scrolled ? "max-h-0 overflow-hidden py-0 opacity-0" : "max-h-12 py-2 opacity-100"}`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4 text-[11px] font-medium tracking-wide sm:gap-6">
            <a href={brand.phoneHref} className="flex shrink-0 items-center gap-1.5 whitespace-nowrap transition hover:text-white">
              <Phone className="h-3 w-3 shrink-0 text-teal-300" />
              <span>{brand.phone}</span>
            </a>
            <a
              href={`mailto:${brand.email}`}
              className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap transition hover:text-white md:flex"
            >
              <Mail className="h-3 w-3 shrink-0 text-teal-300" />
              <span>{brand.email}</span>
            </a>
            <div className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap text-teal-100/80 lg:flex">
              <MapPin className="h-3 w-3 shrink-0 text-teal-300" />
              <span>{shortAddress}</span>
            </div>
          </div>
          {sessionUser?.fullName ? (
            <p className="hidden truncate text-[11px] text-teal-100/75 xl:block">
              Signed in as <span className="font-semibold text-white">{sessionUser.fullName}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className={`transition-all duration-300 ${scrolled ? "py-1.5 sm:py-2" : "py-2 sm:py-3"}`}>
        <div className="mx-auto max-w-7xl px-2.5 sm:px-6 lg:px-8">
          <div
            data-care-header-surface
            className={`flex min-h-14 min-w-0 items-center gap-2 rounded-[20px] border px-2.5 py-2 transition-all duration-300 sm:gap-3 sm:rounded-2xl sm:px-5 sm:py-2.5 ${headerSurface}`}
          >
            <Link
              href={isPlatform ? "/" : `/p/${slug}`}
              className="group flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden sm:gap-3 lg:flex-none"
              aria-label={`${brandLabel} home`}
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] shadow-md shadow-teal-900/20 transition-transform duration-300 group-hover:scale-105 sm:h-10 sm:w-10">
                <BrandMark size={18} />
              </span>
              <span className="flex min-w-0 flex-col leading-none">
                <span
                  className={`block max-w-[9.5rem] truncate text-[17px] font-bold tracking-tight sm:max-w-[13rem] sm:text-xl lg:max-w-none ${
                    onDarkHero ? "text-white" : "text-[var(--foreground)]"
                  }`}
                  style={{ fontFamily: "var(--font-display), serif" }}
                  title={brandLabel}
                >
                  {brandLabel}
                </span>
                <span
                  className={`mt-1 block max-w-[9.5rem] truncate text-[8px] font-semibold uppercase tracking-[0.16em] sm:max-w-[13rem] sm:text-[10px] lg:max-w-none ${
                    onDarkHero ? "text-teal-100/80" : "text-[var(--brand)]"
                  }`}
                  title={brandMeta}
                >
                  {brandMeta}
                </span>
              </span>
            </Link>

            <nav className="hidden shrink-0 items-center gap-1.5 lg:flex" aria-label="Main navigation">
              {categories.map((cat, index) => {
                const catActive = isCategoryActive(cat);
                const isOpen = activeDropdown === cat.key;
                const alignRight = index === categories.length - 1;

                return (
                  <div
                    key={cat.key}
                    className="relative shrink-0"
                    onMouseEnter={() => handleMouseEnter(cat.key)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveDropdown(isOpen ? null : cat.key)}
                      className={`group flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-all ${
                        catActive || isOpen
                          ? onDarkHero
                            ? "bg-white/15 text-white"
                            : "bg-[var(--brand-soft)] text-[var(--brand-deep)]"
                          : onDarkHero
                            ? "text-teal-50/90 hover:bg-white/10 hover:text-white"
                            : "text-[var(--foreground)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-deep)]"
                      }`}
                      aria-expanded={isOpen}
                      aria-haspopup="menu"
                    >
                      <span>{cat.label}</span>
                      <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isOpen ? (
                      <div
                        className={`absolute top-full z-50 w-80 animate-in fade-in slide-in-from-top-2 pt-2 duration-200 ${
                          alignRight ? "right-0" : "left-0"
                        }`}
                        onMouseEnter={() => handleMouseEnter(cat.key)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div
                          className={`rounded-2xl p-3 shadow-2xl backdrop-blur-2xl ${
                            onDarkHero
                              ? "border border-white/15 bg-black/85 text-white ring-1 ring-white/10"
                              : "border border-[var(--line-2)] bg-[var(--card)] text-[var(--foreground)] ring-1 ring-black/5"
                          }`}
                        >
                          <div className="space-y-1">
                            {cat.items.map((sub) => {
                              const SubIcon = sub.icon;
                              const subActive = isActive(sub.href);

                              return (
                                <Link
                                  key={sub.href}
                                  href={withBase(sub.href)}
                                  className={`flex items-start gap-3 rounded-xl p-2.5 transition-all ${
                                    subActive
                                      ? onDarkHero
                                        ? "bg-white/15 text-white"
                                        : "bg-[var(--brand-soft)] text-[var(--brand-deep)]"
                                      : onDarkHero
                                        ? "text-slate-300 hover:bg-white/10 hover:text-white"
                                        : "text-[var(--foreground)] hover:bg-[var(--brand-soft)]"
                                  }`}
                                >
                                  <div
                                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                      onDarkHero
                                        ? "border border-emerald-500/30 bg-emerald-950/80 text-emerald-400"
                                        : "bg-[var(--brand-soft)] text-[var(--brand)]"
                                    }`}
                                  >
                                    <SubIcon className="h-4 w-4 shrink-0" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className={`text-xs font-bold ${onDarkHero ? "text-white" : "text-[var(--foreground)]"}`}>
                                        {sub.label}
                                      </span>
                                      {sub.badge ? (
                                        <span
                                          className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                            onDarkHero
                                              ? "border border-emerald-500/30 bg-emerald-950 text-emerald-300"
                                              : "bg-[var(--brand-soft)] text-[var(--brand-deep)]"
                                          }`}
                                        >
                                          {sub.badge}
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className={`truncate text-[11px] ${onDarkHero ? "text-slate-400" : "text-[var(--muted)]"}`}>
                                      {sub.desc}
                                    </p>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
              <Link
                href={isPlatform ? "/medicines" : withBase("/search")}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-semibold transition sm:h-11 sm:w-auto sm:gap-2 sm:rounded-full sm:px-3 ${
                  onDarkHero
                    ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
                    : "border-[var(--line-2)] bg-[var(--glass-fill)] text-[var(--brand-deep)] hover:bg-[var(--card-elev)]"
                }`}
                aria-label={isPlatform ? "Find medicines" : "Search medications"}
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Search</span>
              </Link>

              <Link
                href={portalCta.href}
                className={`hidden items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold transition sm:flex ${
                  onDarkHero
                    ? "text-white hover:bg-white/10"
                    : portalCta.kind === "guest"
                      ? "text-[var(--foreground)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-deep)]"
                      : "bg-[var(--brand-soft)] text-[var(--brand-deep)] hover:brightness-95"
                }`}
                title={portalCta.label}
              >
                <PortalIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden md:inline">{portalCta.shortLabel}</span>
              </Link>

              <div className="[&_.theme-toggle]:h-10 [&_.theme-toggle]:w-10 [&_.theme-toggle]:rounded-xl sm:[&_.theme-toggle]:h-11 sm:[&_.theme-toggle]:w-11 sm:[&_.theme-toggle]:rounded-full">
                <ThemeToggle />
              </div>

              {isPlatform ? (
                <Link
                  href="/for-pharmacies"
                  className="hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-[#0d6e5a] to-[#084c3f] px-3 py-2 text-xs font-bold text-white shadow-md shadow-teal-900/20 transition-all hover:scale-[1.02] sm:inline-flex sm:px-4 sm:py-2.5"
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-teal-200" />
                  <span>Join as a pharmacy</span>
                </Link>
              ) : (
                <Link
                  href={withBase("/refill")}
                  className="hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-[#0d6e5a] to-[#084c3f] px-3 py-2 text-xs font-bold text-white shadow-md shadow-teal-900/20 transition-all hover:scale-[1.02] sm:inline-flex sm:px-4 sm:py-2.5"
                >
                  <Pill className="h-3.5 w-3.5 shrink-0 text-teal-200" />
                  <span>Request Refill</span>
                </Link>
              )}

              <button
                type="button"
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition lg:hidden ${
                  onDarkHero
                    ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
                    : "border-[var(--line-2)] bg-[var(--glass-fill)] text-[var(--brand-deep)] hover:bg-[var(--card-elev)]"
                }`}
                onClick={() => setMenuOpen((value) => !value)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-controls="mobile-site-navigation"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation menu"
          />

          <nav
            id="mobile-site-navigation"
            aria-label="Mobile navigation"
            className="absolute left-2 right-2 top-[calc(100%+0.25rem)] z-50 max-h-[calc(100dvh-4.75rem)] overflow-y-auto overscroll-contain rounded-[24px] border border-[var(--line-2)] bg-[var(--card)] p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] text-[var(--foreground)] shadow-2xl sm:left-6 sm:right-6 sm:max-h-[calc(100dvh-8rem)] sm:p-5 lg:hidden"
          >
            <div className="mb-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:mb-5 sm:gap-2.5">
              {isPlatform ? (
                <>
                  <Link
                    href="/#pharmacies"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0d6e5a] to-[#084c3f] px-3 py-3 text-xs font-bold text-white shadow-md"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-teal-200" />
                    <span>Find a pharmacy</span>
                  </Link>
                  <Link
                    href="/for-pharmacies"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--line-2)] bg-[var(--brand-soft)] px-3 py-3 text-xs font-bold text-[var(--brand-deep)]"
                  >
                    <Building2 className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                    <span>For pharmacies</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={withBase("/refill")}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0d6e5a] to-[#084c3f] px-3 py-3 text-xs font-bold text-white shadow-md"
                  >
                    <Pill className="h-4 w-4 shrink-0 text-teal-200" />
                    <span>Request Refill</span>
                  </Link>
                  <Link
                    href={withBase("/order")}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--line-2)] bg-[var(--brand-soft)] px-3 py-3 text-xs font-bold text-[var(--brand-deep)]"
                  >
                    <ShoppingBag className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                    <span>Order OTC</span>
                  </Link>
                </>
              )}
            </div>

            <div className="space-y-4 sm:space-y-5">
              {categories.map((cat) => (
                <section key={cat.key} className="space-y-1">
                  <h2 className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand)] sm:px-3 sm:text-[11px]">
                    {cat.label}
                  </h2>
                  <div className="space-y-1">
                    {cat.items.map((sub) => {
                      const SubIcon = sub.icon;
                      const active = isActive(sub.href);

                      return (
                        <Link
                          key={sub.href}
                          href={withBase(sub.href)}
                          onClick={() => setMenuOpen(false)}
                          className={`flex min-w-0 items-center gap-2.5 rounded-2xl px-2.5 py-2.5 text-sm font-semibold transition sm:gap-3 sm:px-3.5 sm:py-3 ${
                            active
                              ? "bg-[var(--brand-soft)] text-[var(--brand-deep)]"
                              : "text-[var(--foreground)] hover:bg-[var(--brand-tint)]"
                          }`}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                            <SubIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="min-w-0 flex-1 truncate">{sub.label}</span>
                              {sub.badge ? (
                                <span className="shrink-0 rounded-full bg-[var(--brand-tint)] px-2 py-0.5 text-[9px] font-bold text-[var(--brand-deep)]">
                                  {sub.badge}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 line-clamp-1 text-[11px] font-normal leading-4 text-[var(--muted)]">{sub.desc}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-2)]" />
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}

              <section className="space-y-1 border-t border-[var(--line)] pt-3">
                <h2 className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand)] sm:px-3 sm:text-[11px]">
                  Account
                </h2>
                <Link
                  href={portalCta.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between rounded-2xl px-2.5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--brand-tint)] sm:px-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                      <PortalIcon className="h-4 w-4" />
                    </div>
                    <span className="truncate">{portalCta.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-2)]" />
                </Link>

                {portalCta.kind === "guest" ? (
                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between rounded-2xl px-2.5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--brand-tint)] sm:px-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                        <User className="h-4 w-4" />
                      </div>
                      <span>Create account</span>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-2)]" />
                  </Link>
                ) : null}
              </section>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--brand-tint)] p-3.5 text-center sm:mt-6 sm:p-4">
              <p className="text-xs font-bold text-[var(--brand-deep)]">
                {isPlatform ? "Need a pharmacy near you?" : "Need help with a prescription?"}
              </p>
              <a
                href={brand.phoneHref}
                className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-[#0d6e5a] px-5 py-2.5 text-xs font-bold text-white shadow-md"
              >
                <Phone className="h-3.5 w-3.5 text-teal-200" />
                <span className="truncate">Call {brand.phone}</span>
              </a>
            </div>
          </nav>
        </>
      ) : null}
    </header>
  );
}
