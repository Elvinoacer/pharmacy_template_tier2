"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Search,
  ChevronDown,
  Phone,
  MapPin,
  Mail,
  User,
  ShieldCheck,
  Pill,
  Sparkles,
  Menu,
  X,
  HeartPulse,
  ShoppingBag,
  Camera,
  Truck,
  HelpCircle,
  Briefcase,
  Info,
  ChevronRight,
  LogIn,
  Stethoscope,
  LayoutDashboard,
  Users,
  BookOpen,
  Activity,
  Syringe,
  Building2,
  BadgeCheck,
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
      { href: "/", label: "Find a pharmacy", desc: "Search verified neighbourhood shops", icon: MapPin, badge: "Network" },
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const portalCta = resolvePortalCta(sessionUser);
  const PortalIcon = CTA_ICON[portalCta.kind];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setActiveDropdown(null);
    setMenuOpen(false);
  }, [pathname]);

  // Close any open mega-menu / drawer with Escape (keyboard users).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDropdown(null);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleMouseEnter = (key: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(key);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  const isActive = (href: string) => {
    const target = withBase(href);
    if (href === "/" && pathname === "/") return true;
    return pathname === target || (target !== "/" && pathname.startsWith(`${target}/`));
  };

  const isCategoryActive = (cat: NavCategory) => cat.items.some((item) => isActive(item.href));

  const shortAddress = brand.addressShort;
  const onDarkHero = isPlatform && pathname === "/" && !scrolled;

  return (
    <header className="fixed inset-x-0 top-0 z-50 transition-all duration-300">
      <div
        className={`hidden sm:block text-xs transition-all duration-300 ${
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
          {sessionUser?.fullName && (
            <p className="hidden truncate text-[11px] text-teal-100/75 xl:block">
              Signed in as <span className="font-semibold text-white">{sessionUser.fullName}</span>
            </p>
          )}
        </div>
      </div>

      <div className={`transition-all duration-300 ${scrolled ? "py-1.5 sm:py-2" : "py-2 sm:py-3"}`}>
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div
            className={`flex items-center justify-between rounded-2xl px-3.5 py-2 transition-all duration-300 sm:px-6 sm:py-2.5 ${
              scrolled
                ? "border border-white/60 bg-white/92 shadow-[0_12px_40px_rgba(8,40,32,0.12)] backdrop-blur-xl"
                : onDarkHero
                  ? "border border-white/10 bg-white/8 shadow-none backdrop-blur-md"
                  : "border border-white/40 bg-white/80 shadow-[0_8px_30px_rgba(8,40,32,0.06)] backdrop-blur-lg"
            }`}
          >
            <Link
              href={isPlatform ? "/" : `/p/${slug}`}
              className="group flex shrink-0 items-center gap-2.5 whitespace-nowrap sm:gap-3"
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] shadow-md shadow-teal-900/20 transition-transform duration-300 group-hover:scale-105 sm:h-10 sm:w-10">
                <BrandMark size={18} />
              </span>
              <span className="flex shrink-0 flex-col leading-none whitespace-nowrap">
                <span
                  className={`text-lg font-bold tracking-tight sm:text-xl ${onDarkHero && !scrolled ? "text-white" : "text-[#0c1a14]"}`}
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {isPlatform ? "Aether" : brand.name.replace(/ Pharmacy$/i, "") || "Aether"}
                </span>
                <span className={`text-[9px] font-semibold uppercase tracking-[0.18em] sm:text-[10px] ${onDarkHero && !scrolled ? "text-teal-100/80" : "text-[#0d6e5a]"}`}>
                  {isPlatform ? "Network" : slug}
                </span>
              </span>
            </Link>

            <nav className="hidden shrink-0 items-center gap-1.5 lg:flex" aria-label="Main Navigation">
              {categories.map((cat) => {
                const catActive = isCategoryActive(cat);
                const isOpen = activeDropdown === cat.key;
                const idle = onDarkHero && !scrolled;
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
                          ? idle
                            ? "bg-white/15 text-white"
                            : "bg-teal-900/8 text-[#084c3f]"
                          : idle
                            ? "text-teal-50/90 hover:bg-white/10 hover:text-white"
                            : "text-[#2d3e35] hover:bg-teal-900/5 hover:text-[#084c3f]"
                      }`}
                      aria-expanded={isOpen}
                    >
                      <span>{cat.label}</span>
                      <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <div
                        className="absolute left-0 top-full z-50 w-80 animate-in fade-in slide-in-from-top-2 pt-2 duration-200"
                        onMouseEnter={() => handleMouseEnter(cat.key)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div className="rounded-2xl border border-white/80 bg-white/95 p-3 shadow-2xl ring-1 ring-black/5 backdrop-blur-2xl">
                          <div className="space-y-1">
                            {cat.items.map((sub) => {
                              const SubIcon = sub.icon;
                              const subActive = isActive(sub.href);
                              return (
                                <Link
                                  key={sub.href}
                                  href={withBase(sub.href)}
                                  className={`flex items-start gap-3 rounded-xl p-2.5 transition-all ${
                                    subActive ? "bg-teal-50/90 text-[#084c3f]" : "text-[#1a2e26] hover:bg-teal-50/60"
                                  }`}
                                >
                                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-900/8 text-[#0d6e5a]">
                                    <SubIcon className="h-4 w-4 shrink-0" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-bold text-[#0c1a14]">{sub.label}</span>
                                      {sub.badge && (
                                        <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-[9px] font-bold text-[#0d6e5a]">
                                          {sub.badge}
                                        </span>
                                      )}
                                    </div>
                                    <p className="truncate text-[11px] text-[#5a6b62]">{sub.desc}</p>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
              <Link
                href={isPlatform ? "/#pharmacies" : withBase("/search")}
                className={`flex h-9 w-9 items-center justify-center gap-2 rounded-full border text-xs font-semibold transition sm:h-auto sm:w-auto sm:px-3 sm:py-2 ${
                  onDarkHero && !scrolled
                    ? "border-white/15 bg-white/10 text-white hover:bg-white/16"
                    : "border-teal-900/10 bg-teal-50/60 text-[#084c3f] hover:bg-white hover:shadow-sm"
                }`}
                aria-label={isPlatform ? "Find pharmacies" : "Search medications"}
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{isPlatform ? "Search" : "Search"}</span>
              </Link>

              <Link
                href={portalCta.href}
                className={`hidden items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold transition sm:flex ${
                  onDarkHero && !scrolled
                    ? "text-white hover:bg-white/10"
                    : portalCta.kind === "guest"
                      ? "text-[#2d3e35] hover:bg-teal-900/5 hover:text-[#084c3f]"
                      : "bg-teal-900/8 text-[#084c3f] hover:bg-teal-900/12"
                }`}
                title={portalCta.label}
              >
                <PortalIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden md:inline">{portalCta.shortLabel}</span>
              </Link>

              {isPlatform ? (
                <Link
                  href="/for-pharmacies"
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-[#0d6e5a] to-[#084c3f] px-3 py-2 text-xs font-bold text-white shadow-md shadow-teal-900/20 transition-all hover:scale-[1.02] sm:px-4 sm:py-2.5"
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-teal-200" />
                  <span className="hidden min-[400px]:inline">Join as a pharmacy</span>
                  <span className="min-[400px]:hidden">Join</span>
                </Link>
              ) : (
                <Link
                  href={withBase("/refill")}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-[#0d6e5a] to-[#084c3f] px-3 py-2 text-xs font-bold text-white shadow-md shadow-teal-900/20 transition-all hover:scale-[1.02] sm:px-4 sm:py-2.5"
                >
                  <Pill className="h-3.5 w-3.5 shrink-0 text-teal-200" />
                  <span className="hidden min-[400px]:inline">Request Refill</span>
                  <span className="min-[400px]:hidden">Refill</span>
                </Link>
              )}

              <button
                type="button"
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border lg:hidden ${
                  onDarkHero && !scrolled
                    ? "border-white/15 bg-white/10 text-white"
                    : "border-teal-900/10 bg-white text-[#084c3f]"
                }`}
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 top-[58px] z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-70px)] overflow-y-auto border-b border-teal-900/10 bg-white/98 p-4 pb-24 shadow-2xl backdrop-blur-2xl sm:p-6 sm:pb-28 lg:hidden">
            <div className="mb-5 grid grid-cols-2 gap-2.5">
              {isPlatform ? (
                <>
                  <Link
                    href="/#pharmacies"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0d6e5a] to-[#084c3f] p-3 text-xs font-bold text-white shadow-md"
                  >
                    <MapPin className="h-4 w-4 text-teal-200" />
                    Find a pharmacy
                  </Link>
                  <Link
                    href="/for-pharmacies"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-teal-900/15 bg-teal-50/70 p-3 text-xs font-bold text-[#084c3f]"
                  >
                    <Building2 className="h-4 w-4 text-[#0d6e5a]" />
                    For pharmacies
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={withBase("/refill")}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0d6e5a] to-[#084c3f] p-3 text-xs font-bold text-white shadow-md"
                  >
                    <Pill className="h-4 w-4 text-teal-200" />
                    Request Refill
                  </Link>
                  <Link
                    href={withBase("/order")}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-teal-900/15 bg-teal-50/70 p-3 text-xs font-bold text-[#084c3f]"
                  >
                    <ShoppingBag className="h-4 w-4 text-[#0d6e5a]" />
                    Order OTC
                  </Link>
                </>
              )}
            </div>

            <div className="space-y-5">
              {categories.map((cat) => (
                <div key={cat.key} className="space-y-1.5">
                  <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#0d6e5a]">{cat.label}</h3>
                  <div className="grid grid-cols-1 gap-1">
                    {cat.items.map((sub) => {
                      const SubIcon = sub.icon;
                      const active = isActive(sub.href);
                      return (
                        <Link
                          key={sub.href}
                          href={withBase(sub.href)}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition ${
                            active ? "bg-teal-50 text-[#084c3f]" : "text-[#0c1a14] hover:bg-teal-50/50"
                          }`}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-900/8 text-[#0d6e5a]">
                            <SubIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span>{sub.label}</span>
                              {sub.badge && (
                                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[9px] font-bold text-[#0d6e5a]">
                                  {sub.badge}
                                </span>
                              )}
                            </div>
                            <p className="line-clamp-1 text-[11px] font-normal text-[#5a6b62]">{sub.desc}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-teal-900/30" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="space-y-1 border-t border-gray-100 pt-3">
                <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#0d6e5a]">Account</h3>
                <Link
                  href={portalCta.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#0c1a14] hover:bg-teal-50/50"
                >
                  <div className="flex items-center gap-3">
                    <PortalIcon className="h-4 w-4 text-[#0d6e5a]" />
                    <span>{portalCta.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-teal-900/30" />
                </Link>
                {portalCta.kind === "guest" && (
                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#0c1a14] hover:bg-teal-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-[#0d6e5a]" />
                      <span>Create account</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-teal-900/30" />
                  </Link>
                )}
              </div>
            </div>

            <div className="mb-4 mt-6 rounded-2xl border border-teal-900/10 bg-[#084c3f]/5 p-4 text-center">
              <p className="text-xs font-bold text-[#084c3f]">
                {isPlatform ? "Need a pharmacy near you?" : "Need help with a prescription?"}
              </p>
              <div className="mt-2 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                <a
                  href={brand.phoneHref}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0d6e5a] px-5 py-2.5 text-xs font-bold text-white shadow-md"
                >
                  <Phone className="h-3.5 w-3.5 text-teal-200" />
                  Call {brand.phone}
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
