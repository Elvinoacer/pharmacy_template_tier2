"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/medicines", label: "Medicines" },
  { href: "/health", label: "Health Library" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "py-2" : "py-4"
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between px-4 transition-all duration-300 sm:px-6 ${
          scrolled
            ? "rounded-2xl border border-white/50 bg-white/90 px-4 py-2.5 shadow-[0_12px_40px_rgba(8,40,32,0.1)] backdrop-blur-xl sm:px-5"
            : "bg-transparent py-1"
        }`}
      >
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] shadow-lg shadow-teal-900/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3c-1.5 3.5-4 5.5-7.5 6.5C8 10.5 10.5 12.5 12 16c1.5-3.5 4-5.5 7.5-6.5C16 8.5 13.5 6.5 12 3Z"
                fill="#5eead4"
              />
              <path d="M12 16v5" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="flex flex-col leading-none">
            <span
              className="text-lg font-semibold tracking-tight text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Aether
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#0d6e5a]">
              Pharmacy
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                isActive(l.href)
                  ? "bg-teal-900/5 text-[#084c3f]"
                  : "text-[#3d4f46] hover:bg-teal-900/5 hover:text-[#084c3f]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-teal-900/10 bg-white/70 text-[#084c3f] transition hover:bg-white sm:inline-flex"
            aria-label="Search"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3-3" strokeLinecap="round" />
            </svg>
          </Link>
          <Link
            href="/login"
            className="hidden rounded-full px-3 py-2 text-sm font-medium text-[#3d4f46] transition hover:bg-teal-900/5 hover:text-[#084c3f] sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/portal"
            className="hidden rounded-full border border-teal-900/10 bg-white/70 px-3 py-2 text-sm font-medium text-[#084c3f] transition hover:bg-white sm:inline"
          >
            Portal
          </Link>
          <Link
            href="/refill"
            className="btn-primary !px-4 !py-2.5 text-sm"
          >
            Request refill
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-teal-900/10 bg-white/70 lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#084c3f" strokeWidth="2">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mx-4 mt-2 rounded-2xl border border-white/60 bg-white/95 p-3 shadow-xl backdrop-blur-xl lg:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`block rounded-xl px-3 py-2.5 text-sm font-medium ${
                isActive(l.href) ? "bg-teal-50 text-[#084c3f]" : "text-[#0c1a14] hover:bg-teal-50"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/search"
            className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[#0c1a14] hover:bg-teal-50"
          >
            Search
          </Link>
          <Link
            href="/delivery"
            className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[#0c1a14] hover:bg-teal-50"
          >
            Delivery
          </Link>
          <Link
            href="/careers"
            className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[#0c1a14] hover:bg-teal-50"
          >
            Careers
          </Link>
          <Link
            href="/login"
            className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[#0c1a14] hover:bg-teal-50"
          >
            Sign in
          </Link>
          <Link
            href="/portal"
            className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[#0c1a14] hover:bg-teal-50"
          >
            Customer portal
          </Link>
          <Link
            href="/admin"
            className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[#0c1a14] hover:bg-teal-50"
          >
            Staff CRM
          </Link>
        </div>
      )}
    </header>
  );
}
