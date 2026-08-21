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
} from "lucide-react";
import { pharmacy } from "@/app/lib/data";
import { resolvePortalCta, type PortalSessionHint } from "@/app/lib/portal-dest";

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

const CATEGORIES: NavCategory[] = [
  {
    key: "services",
    label: "Services & Meds",
    items: [
      {
        href: "/refill",
        label: "Request Refill",
        desc: "Fast Rx refill & status updates",
        icon: Pill,
        badge: "Fastest",
      },
      {
        href: "/medicines",
        label: "OTC Medicines",
        desc: "Browse non-prescription products",
        icon: ShoppingBag,
      },
      {
        href: "/medicines?photo=1",
        label: "Photo medicine search",
        desc: "AI reads your pack, we match live stock",
        icon: Camera,
        badge: "New",
      },
      {
        href: "/order",
        label: "Order OTC Direct",
        desc: "Quick cart for healthcare items",
        icon: ShoppingBag,
      },
      {
        href: "/vaccinations",
        label: "Vaccinations",
        desc: "Book flu, travel & adult vaccines",
        icon: Syringe,
        badge: "Clinic",
      },
      {
        href: "/services",
        label: "Pharmacy Services",
        desc: "Vaccinations & wellness consults",
        icon: Stethoscope,
      },
      {
        href: "/delivery",
        label: "Rx Home Delivery",
        desc: "Same-day delivery to your doorstep",
        icon: Truck,
      },
    ],
  },
  {
    key: "health",
    label: "Health & AI",
    items: [
      {
        href: "/how-do-you-feel",
        label: "How Do You Feel?",
        desc: "AI-powered symptom checker",
        icon: Sparkles,
        badge: "AI Tool",
      },
      {
        href: "/health/self-care-guide",
        label: "Self-Care vs Doctor Guide",
        desc: "When to self-treat vs see a clinician",
        icon: ShieldCheck,
        badge: "Triage",
      },
      {
        href: "/health",
        label: "Health Library",
        desc: "Medication guides & wellness tips",
        icon: HeartPulse,
      },
      {
        href: "/health/counselling",
        label: "Patient Counselling",
        desc: "12-pillar digital medication guides & missed-dose helper",
        icon: BookOpen,
        badge: "12-Pillar",
      },
      {
        href: "/screenings",
        label: "Health Screenings & Vitals",
        desc: "BP, glucose, BMI & clinical referrals",
        icon: Activity,
        badge: "Screening",
      },
      {
        href: "/preventive",
        label: "Preventive health",
        desc: "Counselling, campaigns & education",
        icon: HeartPulse,
        badge: "Prevention",
      },
      {
        href: "/caregiver",
        label: "Caregiver Portal",
        desc: "Manage meds for family members",
        icon: Users,
      },
    ],
  },
  {
    key: "company",
    label: "About & Support",
    items: [
      {
        href: "/about",
        label: "About Aether",
        desc: "Our story & licensed pharmacy team",
        icon: Info,
      },
      {
        href: "/faq",
        label: "FAQ & Help Center",
        desc: "Answers to common Rx questions",
        icon: HelpCircle,
      },
      {
        href: "/careers",
        label: "Careers",
        desc: "Join our healthcare team",
        icon: Briefcase,
      },
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
}: {
  sessionUser?: PortalSessionHint | null;
  pharmacySlug?: string | null;
}) {
  const pathname = usePathname() || "/";
  const fromPath = pathname.match(/^\/p\/([^/]+)/);
  const slug = pharmacySlug || fromPath?.[1] || null;
  const isPlatform =
    !slug ||
    pathname === "/" ||
    pathname.startsWith("/for-pharmacies") ||
    pathname.startsWith("/onboard");

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

  // Lock body scroll when mobile menu is open
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
    return pathname === target || (target !== "/" && pathname.startsWith(`${target}/`));
  };

  const isCategoryActive = (cat: NavCategory) =>
    cat.items.some((item) => isActive(item.href));

  const shortAddress = `${pharmacy.address.street}, ${pharmacy.address.city}`;

  return (
    <header className="fixed inset-x-0 top-0 z-50 transition-all duration-300">
      {/* Top Utility Bar — Hidden on small mobile screens to optimize vertical screen height */}
      <div
        className={`hidden sm:block bg-gradient-to-r from-[#06332a] via-[#084c3f] to-[#0d6e5a] text-[#e3f2ec] text-xs transition-all duration-300 ${
          scrolled ? "max-h-0 opacity-0 overflow-hidden py-0" : "max-h-12 opacity-100 py-2 border-b border-teal-800/40"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6 text-[11px] font-medium tracking-wide">
            <a
              href={pharmacy.phoneHref}
              className="flex items-center gap-1.5 transition hover:text-white whitespace-nowrap shrink-0"
            >
              <Phone className="h-3 w-3 text-teal-300 shrink-0" />
              <span className="whitespace-nowrap">{pharmacy.phone}</span>
            </a>
            <a
              href={`mailto:${pharmacy.email}`}
              className="hidden md:flex items-center gap-1.5 transition hover:text-white whitespace-nowrap shrink-0"
            >
              <Mail className="h-3 w-3 text-teal-300 shrink-0" />
              <span className="whitespace-nowrap">{pharmacy.email}</span>
            </a>
            <div className="hidden lg:flex items-center gap-1.5 text-teal-100/80 whitespace-nowrap shrink-0">
              <MapPin className="h-3 w-3 text-teal-300 shrink-0" />
              <span className="whitespace-nowrap">{shortAddress}</span>
            </div>
          </div>
          {sessionUser?.fullName && (
            <p className="hidden xl:block truncate text-[11px] text-teal-100/75">
              Signed in as <span className="font-semibold text-white">{sessionUser.fullName}</span>
            </p>
          )}
        </div>
      </div>

      {/* Main Floating Navbar */}
      <div className={`transition-all duration-300 ${scrolled ? "py-1.5 sm:py-2" : "py-2 sm:py-3"}`}>
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div
            className={`flex items-center justify-between rounded-2xl transition-all duration-300 px-3.5 py-2 sm:px-6 sm:py-2.5 ${
              scrolled
                ? "border border-white/60 bg-white/92 shadow-[0_12px_40px_rgba(8,40,32,0.12)] backdrop-blur-xl"
                : "border border-white/40 bg-white/80 shadow-[0_8px_30px_rgba(8,40,32,0.06)] backdrop-blur-lg"
            }`}
          >
            {/* Brand Logo */}
            <Link
              href={isPlatform ? "/" : `/p/${slug}`}
              className="group flex items-center gap-2.5 sm:gap-3 shrink-0 whitespace-nowrap"
            >
              <span className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] shadow-md shadow-teal-900/20 transition-transform duration-300 group-hover:scale-105">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="sm:h-5 sm:w-5">
                  <path
                    d="M12 3c-1.5 3.5-4 5.5-7.5 6.5C8 10.5 10.5 12.5 12 16c1.5-3.5 4-5.5 7.5-6.5C16 8.5 13.5 6.5 12 3Z"
                    fill="#5eead4"
                  />
                  <path d="M12 16v5" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <span className="flex flex-col leading-none shrink-0 whitespace-nowrap">
                <span
                  className="text-lg sm:text-xl font-bold tracking-tight text-[#0c1a14] whitespace-nowrap"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Aether
                </span>
                <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0d6e5a] whitespace-nowrap">
                  {isPlatform ? "Network" : slug}
                </span>
              </span>
            </Link>

            {/* Desktop Navigation Categories with Dropdowns */}
            <nav className="hidden lg:flex items-center gap-1.5 shrink-0" aria-label="Main Navigation">
              {CATEGORIES.map((cat) => {
                const catActive = isCategoryActive(cat);
                const isOpen = activeDropdown === cat.key;
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
                      className={`group flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                        catActive || isOpen
                          ? "bg-teal-900/8 text-[#084c3f]"
                          : "text-[#2d3e35] hover:bg-teal-900/5 hover:text-[#084c3f]"
                      }`}
                      aria-expanded={isOpen}
                    >
                      <span className="whitespace-nowrap">{cat.label}</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-[#0d6e5a] shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu Card */}
                    {isOpen && (
                      <div
                        className="absolute left-0 top-full pt-2 w-80 animate-in fade-in slide-in-from-top-2 duration-200 z-50"
                        onMouseEnter={() => handleMouseEnter(cat.key)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div className="rounded-2xl border border-white/80 bg-white/95 p-3 shadow-2xl backdrop-blur-2xl ring-1 ring-black/5">
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
                                      ? "bg-teal-50/90 text-[#084c3f]"
                                      : "hover:bg-teal-50/60 text-[#1a2e26]"
                                  }`}
                                >
                                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-900/8 text-[#0d6e5a]">
                                    <SubIcon className="h-4 w-4 shrink-0" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-[#0c1a14] whitespace-nowrap">
                                        {sub.label}
                                      </span>
                                      {sub.badge && (
                                        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[9px] font-bold text-[#0d6e5a] whitespace-nowrap shrink-0">
                                          {sub.badge}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-[#5a6b62] truncate">
                                      {sub.desc}
                                    </p>
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

              <Link
                href={withBase("/contact")}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold transition whitespace-nowrap shrink-0 ${
                  isActive("/contact")
                    ? "bg-teal-900/8 text-[#084c3f]"
                    : "text-[#2d3e35] hover:bg-teal-900/5 hover:text-[#084c3f]"
                }`}
              >
                Contact
              </Link>
            </nav>

            {/* Right Action Cluster */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <Link
                href={withBase("/search")}
                className="flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center gap-2 rounded-full border border-teal-900/10 bg-teal-50/60 sm:px-3 sm:py-2 text-xs font-semibold text-[#084c3f] transition hover:bg-white hover:shadow-sm whitespace-nowrap shrink-0"
                aria-label="Search medications"
              >
                <Search className="h-4 w-4 text-[#0d6e5a] shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">Search</span>
              </Link>

              <Link
                href={portalCta.href}
                className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition whitespace-nowrap shrink-0 ${
                  portalCta.kind === "guest"
                    ? "text-[#2d3e35] hover:bg-teal-900/5 hover:text-[#084c3f]"
                    : "bg-teal-900/8 text-[#084c3f] hover:bg-teal-900/12"
                }`}
                title={portalCta.label}
              >
                <PortalIcon className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                <span className="hidden md:inline whitespace-nowrap">{portalCta.shortLabel}</span>
              </Link>

              <Link
                href={withBase("/order")}
                className="hidden sm:inline-flex rounded-full border border-teal-900/10 bg-white/90 px-3.5 py-2 text-xs font-bold text-[#084c3f] shadow-xs transition hover:bg-teal-50 whitespace-nowrap shrink-0"
              >
                Order OTC
              </Link>

              <Link
                href={withBase("/refill")}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#0d6e5a] to-[#084c3f] px-3 py-2 sm:px-4 sm:py-2.5 text-xs font-bold text-white shadow-md shadow-teal-900/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-teal-900/30 active:scale-[0.98] whitespace-nowrap shrink-0"
              >
                <Pill className="h-3.5 w-3.5 text-teal-200 shrink-0" />
                <span className="whitespace-nowrap hidden min-[400px]:inline">Request Refill</span>
                <span className="whitespace-nowrap min-[400px]:hidden">Refill</span>
              </Link>

              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-teal-900/10 bg-white text-[#084c3f] lg:hidden shrink-0"
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

      {/* Mobile Backdrop & Drawer Navigation */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 top-[58px] z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer Panel */}
          <div className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-70px)] overflow-y-auto border-b border-teal-900/10 bg-white/98 p-4 pb-24 sm:p-6 sm:pb-28 shadow-2xl backdrop-blur-2xl lg:hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Quick Actions Card Grid */}
            <div className="mb-5 grid grid-cols-2 gap-2.5">
              <Link
                href={withBase("/refill")}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0d6e5a] to-[#084c3f] p-3 text-xs font-bold text-white shadow-md active:scale-95 transition"
              >
                <Pill className="h-4 w-4 text-teal-200" />
                <span>Request Refill</span>
              </Link>
              <Link
                href={withBase("/order")}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-teal-900/15 bg-teal-50/70 p-3 text-xs font-bold text-[#084c3f] active:scale-95 transition"
              >
                <ShoppingBag className="h-4 w-4 text-[#0d6e5a]" />
                <span>Order OTC</span>
              </Link>
            </div>

            {/* Categorized Mobile Navigation Links */}
            <div className="space-y-5">
              {CATEGORIES.map((cat) => (
                <div key={cat.key} className="space-y-1.5">
                  <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#0d6e5a]">
                    {cat.label}
                  </h3>
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
                            active
                              ? "bg-teal-50 text-[#084c3f]"
                              : "text-[#0c1a14] hover:bg-teal-50/50"
                          }`}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-900/8 text-[#0d6e5a]">
                            <SubIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span>{sub.label}</span>
                              {sub.badge && (
                                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[9px] font-bold text-[#0d6e5a]">
                                  {sub.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-normal text-[#5a6b62] line-clamp-1">
                              {sub.desc}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-teal-900/30 shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Direct Support & Portals — session-aware */}
              <div className="pt-3 border-t border-gray-100 space-y-1">
                <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#0d6e5a]">
                  Account & Contact
                </h3>
                <div className="grid grid-cols-1 gap-1">
                  <Link
                    href={withBase("/contact")}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#0c1a14] hover:bg-teal-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-[#0d6e5a]" />
                      <span>Contact Us & Hours</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-teal-900/30" />
                  </Link>

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
            </div>

            {/* Contact footer in Mobile Drawer */}
            <div className="mt-6 mb-4 rounded-2xl bg-[#084c3f]/5 border border-teal-900/10 p-4 text-center shadow-xs">
              <p className="text-xs font-bold text-[#084c3f]">Need help with a prescription?</p>
              <div className="mt-2 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                <a
                  href={pharmacy.phoneHref}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0d6e5a] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#084c3f] active:scale-95 transition"
                >
                  <Phone className="h-3.5 w-3.5 text-teal-200" />
                  <span>Call {pharmacy.phone}</span>
                </a>
                <a
                  href={`mailto:${pharmacy.email}`}
                  className="inline-flex items-center gap-2 rounded-full border border-teal-900/15 bg-white px-4 py-2.5 text-xs font-bold text-[#084c3f] transition hover:bg-teal-50"
                >
                  <Mail className="h-3.5 w-3.5 text-[#0d6e5a]" />
                  <span>{pharmacy.email}</span>
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
