"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Search,
  ChevronDown,
  Phone,
  MapPin,
  Clock,
  User,
  ShieldCheck,
  Pill,
  Sparkles,
  Menu,
  X,
  FileText,
  HeartPulse,
  ShoppingBag,
  Camera,
  Truck,
  HelpCircle,
  Briefcase,
  Info,
  ArrowRight,
  LogIn,
  Stethoscope,
} from "lucide-react";

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
        desc: "Browse stock or snap a pack photo",
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
        href: "/health",
        label: "Health Library",
        desc: "Medication guides & wellness tips",
        icon: HeartPulse,
      },
      {
        href: "/caregiver",
        label: "Caregiver Portal",
        desc: "Manage meds for family members",
        icon: ShieldCheck,
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
        desc: "Join our Austin healthcare team",
        icon: Briefcase,
      },
    ],
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setActiveDropdown(null);
    setMenuOpen(false);
  }, [pathname]);

  const handleMouseEnter = (key: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(key);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  const isCategoryActive = (cat: NavCategory) =>
    cat.items.some((item) => isActive(item.href));

  return (
    <header className="fixed inset-x-0 top-0 z-50 transition-all duration-300">
      {/* Top Announcement & Utility Bar */}
      <div
        className={`bg-gradient-to-r from-[#06332a] via-[#084c3f] to-[#0d6e5a] text-[#e3f2ec] text-xs transition-all duration-300 ${
          scrolled ? "max-h-0 opacity-0 overflow-hidden py-0" : "max-h-12 opacity-100 py-2 border-b border-teal-800/40"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 sm:gap-6 text-[11px] font-medium tracking-wide">
            <a
              href="tel:5125550199"
              className="flex items-center gap-1.5 transition hover:text-white whitespace-nowrap shrink-0"
            >
              <Phone className="h-3 w-3 text-teal-300 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">(512) 555-0199</span>
              <span className="sm:hidden whitespace-nowrap">Call Pharmacy</span>
            </a>
            <div className="hidden md:flex items-center gap-1.5 text-teal-100/80 whitespace-nowrap shrink-0">
              <MapPin className="h-3 w-3 text-teal-300 shrink-0" />
              <span className="whitespace-nowrap">1200 S Congress Ave, Austin, TX</span>
            </div>
            <div className="hidden lg:flex items-center gap-1.5 text-teal-100/80 whitespace-nowrap shrink-0">
              <Clock className="h-3 w-3 text-teal-300 shrink-0" />
              <span className="whitespace-nowrap">Open Today: 8:00 AM – 8:00 PM</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 text-[11px] font-medium">
            <Link
              href="/caregiver"
              className="hidden sm:flex items-center gap-1 transition hover:text-white whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="h-3 w-3 text-emerald-300 shrink-0" />
              <span className="whitespace-nowrap">Caregiver Hub</span>
            </Link>
            <Link
              href="/portal"
              className="flex items-center gap-1 transition hover:text-white whitespace-nowrap shrink-0"
            >
              <User className="h-3 w-3 text-teal-300 shrink-0" />
              <span className="whitespace-nowrap">Patient Portal</span>
            </Link>
            <Link
              href="/admin"
              className="hidden md:inline-block rounded bg-teal-900/60 px-2 py-0.5 text-[10px] text-teal-200 hover:bg-teal-900 hover:text-white transition border border-teal-700/50 whitespace-nowrap shrink-0"
            >
              Staff Portal
            </Link>
          </div>
        </div>
      </div>

      {/* Main Floating Navbar */}
      <div className={`transition-all duration-300 ${scrolled ? "py-2" : "py-3"}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className={`flex items-center justify-between rounded-2xl transition-all duration-300 px-4 py-2.5 sm:px-6 ${
              scrolled
                ? "border border-white/60 bg-white/92 shadow-[0_12px_40px_rgba(8,40,32,0.12)] backdrop-blur-xl"
                : "border border-white/40 bg-white/75 shadow-[0_8px_30px_rgba(8,40,32,0.06)] backdrop-blur-lg"
            }`}
          >
            {/* Brand Logo */}
            <Link href="/" className="group flex items-center gap-3 shrink-0 whitespace-nowrap">
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] shadow-md shadow-teal-900/20 transition-transform duration-300 group-hover:scale-105">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 3c-1.5 3.5-4 5.5-7.5 6.5C8 10.5 10.5 12.5 12 16c1.5-3.5 4-5.5 7.5-6.5C16 8.5 13.5 6.5 12 3Z"
                    fill="#5eead4"
                  />
                  <path d="M12 16v5" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <span className="flex flex-col leading-none shrink-0 whitespace-nowrap">
                <span
                  className="text-xl font-bold tracking-tight text-[#0c1a14] whitespace-nowrap"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Aether
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0d6e5a] whitespace-nowrap">
                  Pharmacy & Wellness
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
                                  href={sub.href}
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

              {/* Direct Contact Link */}
              <Link
                href="/contact"
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
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Search Pill */}
              <Link
                href="/search"
                className="flex items-center gap-2 rounded-full border border-teal-900/10 bg-teal-50/50 px-3 py-2 text-xs font-semibold text-[#084c3f] transition hover:bg-white hover:shadow-sm whitespace-nowrap shrink-0"
                aria-label="Search medications"
              >
                <Search className="h-4 w-4 text-[#0d6e5a] shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">Search</span>
              </Link>

              {/* Sign In button */}
              <Link
                href="/login"
                className="hidden xl:flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-[#2d3e35] transition hover:bg-teal-900/5 hover:text-[#084c3f] whitespace-nowrap shrink-0"
              >
                <LogIn className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
                <span className="whitespace-nowrap">Sign in</span>
              </Link>

              {/* Order OTC pill */}
              <Link
                href="/order"
                className="hidden sm:inline-flex rounded-full border border-teal-900/10 bg-white/90 px-3.5 py-2 text-xs font-bold text-[#084c3f] shadow-xs transition hover:bg-teal-50 whitespace-nowrap shrink-0"
              >
                Order OTC
              </Link>

              {/* Primary Refill CTA */}
              <Link
                href="/refill"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#0d6e5a] to-[#084c3f] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-900/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-teal-900/30 active:scale-[0.98] whitespace-nowrap shrink-0"
              >
                <Pill className="h-3.5 w-3.5 text-teal-200 shrink-0" />
                <span className="whitespace-nowrap">Request Refill</span>
              </Link>

              {/* Mobile Menu Toggle Button */}
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-teal-900/10 bg-white text-[#084c3f] lg:hidden"
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

      {/* Mobile Drawer Navigation */}
      {menuOpen && (
        <div className="mx-4 mt-2 max-h-[85vh] overflow-y-auto rounded-3xl border border-white/80 bg-white/98 p-5 shadow-2xl backdrop-blur-2xl lg:hidden">
          {/* Quick Actions Header in Mobile */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Link
              href="/refill"
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0d6e5a] to-[#084c3f] p-3 text-xs font-bold text-white shadow-md"
            >
              <Pill className="h-4 w-4" />
              <span>Request Refill</span>
            </Link>
            <Link
              href="/order"
              className="flex items-center justify-center gap-2 rounded-2xl border border-teal-900/15 bg-teal-50/70 p-3 text-xs font-bold text-[#084c3f]"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Order OTC</span>
            </Link>
          </div>

          {/* Categorized Menu Items */}
          <div className="space-y-4">
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="space-y-1">
                <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#0d6e5a]">
                  {cat.label}
                </h3>
                <div className="grid grid-cols-1 gap-1">
                  {cat.items.map((sub) => {
                    const SubIcon = sub.icon;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                          isActive(sub.href)
                            ? "bg-teal-50 text-[#084c3f]"
                            : "text-[#0c1a14] hover:bg-teal-50/50"
                        }`}
                      >
                        <SubIcon className="h-4 w-4 text-[#0d6e5a]" />
                        <span>{sub.label}</span>
                        {sub.badge && (
                          <span className="ml-auto rounded-full bg-teal-100 px-2 py-0.5 text-[9px] font-bold text-[#0d6e5a]">
                            {sub.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-gray-100 space-y-1">
              <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#0d6e5a]">
                Quick Links & Portals
              </h3>
              <Link
                href="/contact"
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[#0c1a14] hover:bg-teal-50/50"
              >
                <Phone className="h-4 w-4 text-[#0d6e5a]" />
                <span>Contact & Hours</span>
              </Link>
              <Link
                href="/portal"
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[#0c1a14] hover:bg-teal-50/50"
              >
                <User className="h-4 w-4 text-[#0d6e5a]" />
                <span>Customer Patient Portal</span>
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[#0c1a14] hover:bg-teal-50/50"
              >
                <LogIn className="h-4 w-4 text-[#0d6e5a]" />
                <span>Account Sign In</span>
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[#0c1a14] hover:bg-teal-50/50"
              >
                <ShieldCheck className="h-4 w-4 text-[#0d6e5a]" />
                <span>Staff CRM Portal</span>
              </Link>
            </div>
          </div>

          {/* Emergency / Contact Footer inside Mobile Menu */}
          <div className="mt-4 rounded-2xl bg-teal-900/5 p-3.5 text-center">
            <p className="text-xs font-semibold text-[#084c3f]">Need Immediate Help?</p>
            <a
              href="tel:5125550199"
              className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-[#0d6e5a] underline"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Call (512) 555-0199</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

