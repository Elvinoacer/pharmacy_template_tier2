"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ElementType } from "react";
import {
  ArrowRight,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  HeartPulse,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Navigation,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import BrandMark from "@/app/components/BrandMark";
import { platform } from "@/app/lib/data";
import type { DirectoryPharmacy } from "@/app/lib/services/pharmacy-directory";
import heroBackdrop from "@/landing_page_designs/hero_bg_img2.png";
import networkBackdrop from "@/landing_page_designs/hero_bgimg1.png";

type LandingIcon = ElementType<{ className?: string; strokeWidth?: number }>;

const HERO_ACTIONS: { label: string; description: string; href: string; icon: LandingIcon }[] = [
  {
    label: "Find Pharmacies",
    description: "Locate trusted pharmacies near you in seconds.",
    href: "/pharmacies",
    icon: MapPin,
  },
  {
    label: "Refill Prescriptions",
    description: "Easily refill and manage your prescriptions online.",
    href: "/refill",
    icon: FileText,
  },
  {
    label: "Health Advice",
    description: "Get professional guidance from qualified pharmacists.",
    href: "/how-do-you-feel",
    icon: MessageCircle,
  },
  {
    label: "Quality Assured",
    description: "Verified pharmacies. Genuine medicines. Your safety first.",
    href: "/about",
    icon: ShieldCheck,
  },
];

const HERO_STATS: { value: string; label: string; icon: LandingIcon }[] = [
  { value: "200+", label: "Trusted Pharmacies", icon: Store },
  { value: "10,000+", label: "Happy Customers", icon: UsersRound },
  { value: "100%", label: "Genuine Medicines", icon: ShieldCheck },
  { value: "24/7", label: "Care & Support", icon: Clock3 },
];

const TRUST_AVATARS = [
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/priya-nair.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/marcus-chen.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/sofia-alvarez.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/david-kim.webp",
];

const FALLBACK_LISTING = {
  name: "Aether Pharmacy",
  location: "Nairobi, Nairobi",
  stock: "0 OTC items in stock",
  cover: networkBackdrop,
};

const FOOTER_EXPLORE = [
  { href: "/about", label: "About the network", icon: UsersRound },
  { href: "/for-pharmacies", label: "For pharmacies", icon: Building2 },
  { href: "/onboard", label: "Join as a pharmacy", icon: Store },
  { href: "/health", label: "Health library", icon: FileText },
  { href: "/how-do-you-feel", label: "Self-care & triage", icon: HeartPulse },
  { href: "/health/counselling", label: "Medication counselling", icon: MessageCircle },
];

const FOOTER_START = [
  { href: "/register", label: "Create a patient account", icon: UserRound },
  { href: "/login", label: "Sign in", icon: Navigation },
  { href: "/pharmacies", label: "Find a pharmacy", icon: MapPin },
  { href: "/privacy", label: "Privacy", icon: ShieldCheck },
  { href: "/terms", label: "Terms", icon: FileText },
];

export default function AetherLanding({ pharmacies }: { pharmacies: DirectoryPharmacy[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePharmacy, setActivePharmacy] = useState(0);
  const selected = pharmacies.length > 0 ? pharmacies[activePharmacy % pharmacies.length] : null;
  const listing = {
    name: selected?.name || FALLBACK_LISTING.name,
    location: [selected?.city, selected?.county].filter(Boolean).join(", ") || FALLBACK_LISTING.location,
    stock: selected ? `${selected.otcCount} OTC items in stock` : FALLBACK_LISTING.stock,
    cover: selected?.coverImageUrl || FALLBACK_LISTING.cover,
    slug: selected?.slug,
    whatsapp: selected?.whatsapp,
    hasDelivery: selected?.hasDelivery ?? true,
  };

  const movePharmacy = (direction: 1 | -1) => {
    if (pharmacies.length < 2) return;
    setActivePharmacy((current) => (current + direction + pharmacies.length) % pharmacies.length);
  };

  const whatsappHref = listing.whatsapp
    ? `https://wa.me/${listing.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${listing.name}, I found you on Aether and would like to ask about a medicine or service.`)}`
    : platform.whatsappHref;

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="aether-landing">
      <section className="aether-hero" id="top">
        <Image
          src={heroBackdrop}
          alt="A calm, modern pharmacy interior"
          fill
          priority
          sizes="100vw"
          className="aether-hero-background"
        />
        <div className="aether-hero-overlay" aria-hidden="true" />

        <header className="aether-nav-wrap">
          <div className="aether-nav">
            <Link href="#top" className="aether-brand" onClick={closeMenu}>
              <span className="aether-brand-mark"><BrandMark size={31} /></span>
              <span className="aether-brand-copy">
                <span className="aether-brand-name">Aether</span>
                <span className="aether-brand-network">Network</span>
              </span>
            </Link>

            <nav className="aether-desktop-links" aria-label="Primary navigation">
              <Link href="/pharmacies">For patients <ChevronDown /></Link>
              <Link href="/for-pharmacies">For pharmacies <ChevronDown /></Link>
              <Link href="/about">About <ChevronDown /></Link>
            </nav>

            <div className="aether-desktop-actions">
              <Link href="/pharmacies?focus=search" className="aether-nav-search"><Search /> <span>Search</span></Link>
              <Link href="/login" className="aether-signin"><Navigation /> <span>Sign in</span></Link>
              <Link href="/for-pharmacies" className="aether-join"><Building2 /> <span>Join as a pharmacy</span></Link>
            </div>

            <div className="aether-mobile-actions">
              <Link href="/pharmacies?focus=search" aria-label="Search pharmacies" className="aether-mobile-search"><Search /></Link>
              <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} className="aether-menu-toggle">
                {menuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="aether-mobile-menu">
              <Link href="/pharmacies" onClick={closeMenu}>For patients <ChevronRight /></Link>
              <Link href="/for-pharmacies" onClick={closeMenu}>For pharmacies <ChevronRight /></Link>
              <Link href="/about" onClick={closeMenu}>About <ChevronRight /></Link>
              <Link href="/login" onClick={closeMenu}>Sign in <ChevronRight /></Link>
              <Link href="/for-pharmacies" onClick={closeMenu} className="aether-mobile-join">Join as a pharmacy <ArrowRight /></Link>
            </div>
          )}
        </header>

        <div className="aether-hero-inner">
          <div className="aether-hero-copy">
            <p className="aether-eyebrow"><span /> Kenya pharmacy network</p>
            <h1>Care that<br />still feels<br /><em>local.</em></h1>
            <p className="aether-hero-description">Find trusted pharmacies near you. Refill prescriptions, get health advice, and access the care you deserve.</p>

            <form action="/pharmacies" method="get" className="aether-hero-search">
              <MapPin />
              <input name="q" type="search" placeholder="Search for a pharmacy or service..." aria-label="Search for a pharmacy or service" />
              <button type="submit" aria-label="Search"><Search /></button>
            </form>

            <div className="aether-hero-buttons">
              <Link href="#network" className="aether-primary-button">See how it works <ArrowRight /></Link>
              <Link href="#need" className="aether-demo-link"><span><span className="aether-play-icon">▶</span> Watch demo</span></Link>
            </div>

            <div className="aether-trusted-row">
              <div className="aether-avatars" aria-hidden="true">
                {TRUST_AVATARS.map((avatar) => <Image key={avatar} src={avatar} alt="" width={35} height={35} />)}
              </div>
              <p><strong>Trusted by 10,000+ Kenyans</strong><span>across <b>200+ pharmacies</b></span></p>
            </div>
          </div>

          <aside className="aether-hero-panel">
            <h2>Everything you need,<br /><em>all in one place</em></h2>
            <div className="aether-action-list">
              {HERO_ACTIONS.map(({ label, description, href, icon: Icon }) => (
                <Link href={href} key={label} className="aether-action-card">
                  <span className="aether-action-icon"><Icon /></span>
                  <span className="aether-action-copy"><strong>{label}</strong><small>{description}</small></span>
                  <ArrowRight className="aether-action-arrow" />
                </Link>
              ))}
            </div>
          </aside>
        </div>

        <div className="aether-stat-bar">
          {HERO_STATS.map(({ value, label, icon: Icon }) => (
            <div key={label} className="aether-stat">
              <span className="aether-stat-icon"><Icon /></span>
              <span><strong>{value}</strong><small>{label}</small></span>
            </div>
          ))}
        </div>
      </section>

      <section className="aether-network" id="network">
        <Image src={networkBackdrop} alt="" fill sizes="100vw" className="aether-network-background" />
        <div className="aether-network-overlay" aria-hidden="true" />
        <div className="aether-network-inner">
          <div className="aether-network-main">
            <div className="aether-network-intro">
              <p className="aether-eyebrow aether-eyebrow-teal">Care near you</p>
              <h2>Choose a trusted<br />local <em>pharmacy.</em></h2>
              <p>Discover verified pharmacies near you. Quality care, trusted by your community.</p>
              <form action="/pharmacies" method="get" className="aether-network-search">
                <MapPin />
                <input name="q" type="search" placeholder="Search by pharmacy name, area or service..." aria-label="Search by pharmacy name, area or service" />
                <button type="submit" aria-label="Search directory"><Search /></button>
              </form>

              <div className="aether-network-benefits">
                <div><ShieldCheck /><span><b>Verified & Licensed</b><small>All pharmacies are verified by our team</small></span></div>
                <div><Store /><span><b>0 OTC Items</b><small>Wide range of OTC medicines in stock</small></span></div>
                <div><Truck /><span><b>Fast & Reliable</b><small>Quick service and doorstep delivery</small></span></div>
              </div>
            </div>

            <div className="aether-carousel-shell">
              <article className="aether-pharmacy-card">
                <Image src={listing.cover} alt={`${listing.name} storefront`} fill sizes="(max-width: 900px) 92vw, 820px" className="aether-pharmacy-image" />
                <div className="aether-pharmacy-overlay" />
                <span className="aether-featured-pill"><Sparkles /> Featured Pharmacy</span>
                <div className="aether-pharmacy-info">
                  <h3>{listing.name}</h3>
                  <p><MapPin /> {listing.location}</p>
                  <div className="aether-pharmacy-tags"><span>Open now · Closes 10:00 PM</span><span>{listing.stock}</span></div>
                  <div className="aether-pharmacy-bottom"><span className="aether-rating">★ <b>4.9</b> <small>(230+ reviews)</small></span><div><a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="aether-round-action" aria-label={`Message ${listing.name} on WhatsApp`}><MessageCircle /></a>{listing.slug ? <Link href={`/p/${listing.slug}`} className="aether-storefront-button">Visit storefront <ArrowRight /></Link> : <Link href="/pharmacies" className="aether-storefront-button">Visit directory <ArrowRight /></Link>}</div></div>
                </div>
              </article>
              <button type="button" onClick={() => movePharmacy(-1)} aria-label="Previous featured pharmacy" className="aether-carousel-control aether-carousel-prev"><ChevronLeft /></button>
              <button type="button" onClick={() => movePharmacy(1)} aria-label="Next featured pharmacy" className="aether-carousel-control aether-carousel-next"><ChevronRight /></button>
            </div>
          </div>

          <div className="aether-directory-row">
            <span className="aether-directory-icon"><Navigation /></span>
            <span><strong>Can&apos;t find what you&apos;re looking for?</strong><small>Search our complete directory of pharmacies and services.</small></span>
            <Link href="/pharmacies">Open directory <ArrowRight /></Link>
          </div>

          <div className="aether-network-stats">
            <div><MapPin /><span><b>PPB</b><small>Licensed pharmacies</small></span></div>
            <div><Clock3 /><span><b>&lt; 45m</b><small>Average delivery time</small></span></div>
            <div><ShieldCheck /><span><b>M-Pesa</b><small>Secure payments</small></span></div>
            <div><HeartPulse /><span><b>24/7 Support</b><small>Always here to help</small></span></div>
          </div>
        </div>
      </section>

      <section className="aether-need" id="need">
        <div className="aether-need-card">
          <div className="aether-need-copy">
            <p className="aether-eyebrow aether-eyebrow-yellow">Ready when you are</p>
            <h2>What do you<br /><em>need</em> today?</h2>
            <p>From finding trusted pharmacies to refilling prescriptions, we&apos;re here to make healthcare simpler for you.</p>
            <div className="aether-need-buttons"><Link href="/pharmacies" className="aether-yellow-button"><Store /> Find a pharmacy <ArrowRight /></Link><a href={platform.whatsappHref} target="_blank" rel="noopener noreferrer" className="aether-dark-button"><MessageCircle /> Ask on WhatsApp</a></div>
          </div>
          <div className="aether-orbit-visual" aria-hidden="true">
            <div className="aether-orbit-ring aether-orbit-ring-one" /><div className="aether-orbit-ring aether-orbit-ring-two" /><div className="aether-orbit-ring aether-orbit-ring-three" />
            <div className="aether-orbit-center"><HeartPulse /></div>
            <div className="aether-orbit-dot aether-orbit-dot-one" /><div className="aether-orbit-dot aether-orbit-dot-two" /><div className="aether-orbit-dot aether-orbit-dot-three" />
            <div className="aether-orbit-pill aether-orbit-pill-one"><span><MapPin /></span><b>Find pharmacies<small>Near you</small></b></div>
            <div className="aether-orbit-pill aether-orbit-pill-two"><span><FileText /></span><b>Refill prescriptions<small>Quick & easy</small></b></div>
            <div className="aether-orbit-pill aether-orbit-pill-three"><span><MessageCircle /></span><b>Health advice<small>From experts</small></b></div>
            <div className="aether-orbit-pill aether-orbit-pill-four"><span><ShieldCheck /></span><b>Trusted care<small>Always</small></b></div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

function LandingFooter() {
  return (
    <footer className="aether-footer">
      <div className="aether-footer-panel">
        <div className="aether-footer-grid">
          <div className="aether-footer-brand-column">
            <Link href="#top" className="aether-brand"><span className="aether-brand-mark"><BrandMark size={31} /></span><span className="aether-brand-copy"><span className="aether-brand-name">Aether</span><span className="aether-brand-network">Network</span></span></Link>
            <p>The trusted pharmacy network for Kenya. Connecting communities to quality care, every day.</p>
            <span className="aether-footer-trust"><ShieldCheck /> Trusted by <b>10,000+</b> Kenyans</span>
            <div className="aether-socials"><a href={platform.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">f</a><a href={platform.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">◎</a><a href={platform.social.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">in</a><a href={platform.whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><MessageCircle /></a></div>
            <Link href="/pharmacies" className="aether-footer-location"><MapPin /><span><b>200+ licensed pharmacies</b><small>across Kenya</small></span><ArrowRight /></Link>
          </div>

          <FooterLinks title="Explore" links={FOOTER_EXPLORE} />
          <FooterLinks title="Get started" links={FOOTER_START} />

          <div className="aether-footer-network-column">
            <h3>Network</h3>
            <a href="/pharmacies"><Navigation /> Licensed pharmacies across Kenya <ArrowRight /></a>
            <a href={platform.phoneHref}><MessageCircle /> {platform.phone} <ArrowRight /></a>
            <a href={`mailto:${platform.email}`}><Mail /> {platform.email} <ArrowRight /></a>
            <span><Clock3 /> Mon – Sat: 8AM – 8PM <small>We&apos;re here to help</small></span>
          </div>

          <div className="aether-newsletter">
            <h3>Stay in the loop</h3>
            <p>Get health tips, updates, and important news from the Aether network.</p>
            <form action="/contact" method="get"><input type="email" name="email" placeholder="Enter your email" aria-label="Email address" /><button type="submit" aria-label="Subscribe"><Mail /></button></form>
            <small><LockKeyhole /> We respect your privacy.</small>
          </div>
        </div>

        <div className="aether-footer-assurances">
          <div><ShieldCheck /><span><b>Quality Assured</b><small>Verified pharmacies you can trust</small></span></div>
          <div><Truck /><span><b>Fast & Reliable</b><small>Quick service and doorstep delivery</small></span></div>
          <div><HeartPulse /><span><b>24/7 Support</b><small>Our team is always here to help</small></span></div>
          <div><LockKeyhole /><span><b>Secure & Private</b><small>Your health data is protected</small></span></div>
        </div>

        <div className="aether-footer-bottom"><span>© {new Date().getFullYear()} Aether Pharmacy Network. All rights reserved.</span><span>♥ &nbsp; Proudly serving communities across <b>Kenya</b></span><span><Link href="/privacy">Privacy Policy</Link><i>•</i><Link href="/terms">Terms of Service</Link></span><span className="aether-made-with">Made with 💛</span></div>
      </div>
    </footer>
  );
}

function FooterLinks({ title, links }: { title: string; links: { href: string; label: string; icon: LandingIcon }[] }) {
  return <div className="aether-footer-links"><h3>{title}</h3>{links.map(({ href, label, icon: Icon }) => <Link href={href} key={href}><Icon /> <span>{label}</span><ArrowRight /></Link>)}</div>;
}
