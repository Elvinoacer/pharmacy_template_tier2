"use client";

import { ADMIN_PAGES, ADMIN_WORKFLOWS, adminPageForPath } from "./admin-pages";
import { useAppTheme } from "../ThemeProvider";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Pill,
  Megaphone,
  Bell,
  Send,
  Inbox,
  Brain,
  Sparkles,
  Star,
  BookOpen,
  FileText,
  CalendarClock,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Home,
  ChevronRight,
  ChevronDown,
  Moon,
  Sun,
  Monitor,
  Package,
  HeartPulse,
  Stethoscope,
  ShoppingCart,
  RefreshCw,
  TrendingUp,
  ClipboardCheck,
  Settings,
  Search,
  Pin,
  Activity,
  Boxes,
  Syringe,
  Palette,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/app/lib/types";
import { PharmacySwitcher } from "@/app/components/admin/PharmacySwitcher";
import {
  useSidebarEnhanced,
  useAttentionCounts,
  useActivePath,
  isLinkActive,
  formatBadgeCount,
} from "@/app/components/shell/useShell";
import { PushNotificationCenter } from "@/app/components/PushNotificationCenter";
import { LiveAlertCenter } from "@/app/components/LiveAlertCenter";
import { TenantBrandProvider } from "@/app/components/TenantBrand";
import { canAccessAdminPath } from "@/app/lib/platform/admin-access";

export const ADMIN_GROUPS = {
  main: { label: "Daily work", icon: LayoutDashboard },
  clinical: { label: "Prescriptions & clinic", icon: Stethoscope },
  commerce: { label: "Sales, stock & patients", icon: Package },
  care: { label: "Patient follow-up", icon: HeartPulse },
  intelligence: { label: "Reports & management", icon: Sparkles },
} as const;

export const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, group: "main", description: "Overview & key metrics" },
  { href: "/admin/prescriptions", label: "Prescriptions", icon: FileText, group: "main", description: "9-channel intake & review" },
  { href: "/admin/refills", label: "Refill Requests", icon: RefreshCw, group: "main", description: "Course renewal queue" },
  { href: "/admin/dispensing", label: "Dispensing Register", icon: ClipboardCheck, group: "clinical", description: "Controlled prescription log" },
  { href: "/admin/medications", label: "Medicines", icon: Pill, group: "clinical", description: "Drug master & inventory" },
  { href: "/admin/services", label: "Clinical Services", icon: Stethoscope, group: "clinical", description: "Consults & vaccinations" },
  { href: "/admin/screenings", label: "Screenings & referrals", icon: Activity, group: "clinical", description: "Vitals, POCT & clinical referrals" },
  { href: "/admin/vaccinations", label: "Vaccination Clinic", icon: Syringe, group: "clinical", description: "Immunisation, AEFI & campaigns" },
  { href: "/admin/orders", label: "Orders & POS", icon: ShoppingCart, group: "main", description: "Counter sales & invoices" },
  { href: "/admin/inventory", label: "Inventory & Stock", icon: Boxes, group: "commerce", description: "FEFO batches & expiry" },
  { href: "/admin/customers", label: "Patients & Customers", icon: Users, group: "commerce", description: "Patient profiles & records" },
  { href: "/admin/adherence", label: "Adherence & follow-up", icon: Activity, group: "care", description: "Outreach, sync & adherence" },
  { href: "/admin/inbox", label: "Messages & Enquiries", icon: Inbox, group: "main", description: "WhatsApp & email inbox" },
  { href: "/admin/feel", label: "Symptom Check-ins", icon: HeartPulse, group: "care", badgeKey: "feel", description: "Patient adherence checks" },
  { href: "/admin/campaigns", label: "Campaigns & Outreach", icon: Megaphone, group: "care", description: "SMS, WhatsApp & email" },
  { href: "/admin/reminders", label: "Automated Reminders", icon: CalendarClock, group: "care", description: "Refill & dose notifications" },
  { href: "/admin/loyalty", label: "Loyalty", icon: Star, group: "care", description: "Rewards & customer reviews" },
  { href: "/admin/analytics", label: "Analytics & Reports", icon: TrendingUp, group: "intelligence", description: "Revenue, refills & audit" },
  { href: "/admin/ai", label: "AI review queue", icon: Brain, group: "intelligence", description: "Escalations & clinical AI" },
  { href: "/admin/segments", label: "Customer Segments", icon: Users, group: "intelligence", description: "Audience builder & CRM groups" },
  { href: "/admin/templates", label: "Message Templates", icon: FileText, group: "intelligence", description: "Reusable SMS & email copy" },
  { href: "/admin/messages", label: "Message Composer", icon: Send, group: "intelligence", description: "Direct patient messaging" },
  { href: "/admin/knowledge", label: "AI Knowledge Base", icon: BookOpen, group: "intelligence", description: "Approved assistant answers" },
  { href: "/admin/notifications", label: "Admin Notifications", icon: Bell, group: "intelligence", description: "Operational alert inbox" },
  { href: "/admin/settings/storefront", label: "Storefront studio", icon: Palette, group: "intelligence", description: "Website appearance and content" },
  { href: "/admin/settings/location", label: "Pharmacy Settings", icon: Settings, group: "intelligence", description: "Store & branch config" },
  { href: "/admin/settings/integrations", label: "Integrations", icon: Settings, group: "intelligence", description: "M-Pesa, SMS, WhatsApp, POS" },
  { href: "/admin/setup", label: "Go-live checklist", icon: ClipboardCheck, group: "intelligence", description: "Onboarding remaining items" },
  { href: "/admin/services/bookings", label: "Service bookings", icon: CalendarClock, group: "clinical", description: "Review appointments and payments" },
  { href: "/admin/enquiries", label: "Patient enquiries", icon: Inbox, group: "care", description: "Respond to patient questions" },
  { href: "/admin/feedback", label: "Patient feedback", icon: Star, group: "care", description: "Read reviews and respond" },
] as const;

type ThemeMode = "light" | "dark" | "system";

export function AdminShell({ user, children, title, subtitle, actions }: {
  user: SessionUser; children: React.ReactNode; title?: string; subtitle?: string; actions?: React.ReactNode;
}) {
  const { collapsed, toggle, hydrated, pinned, togglePin } = useSidebarEnhanced("admin");
  const [query, setQuery] = useState("");
  const drawer = useRef<HTMLDialogElement>(null);
  const finder = useRef<HTMLDialogElement>(null);
  const main = useRef<HTMLElement>(null);
  const openFinder = useCallback(() => {
    setQuery("");
    drawer.current?.close();
    finder.current?.showModal();
    finder.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, []);
  const pathname = useActivePath();
  const theme = useAppTheme();
  const attention = useAttentionCounts();
  const membership = user.memberships.find(m => m.pharmacyId === user.activePharmacyId) || user.memberships[0];
  const brand = { name: membership?.name || "Pharmacy", network: "Aether Pharmacy Network", slug: membership?.slug || null };
  const current = adminPageForPath(pathname);
  const accessibleLinks = ADMIN_LINKS.filter(link => canAccessAdminPath(user, link.href));
  const workflow = ADMIN_WORKFLOWS.find(group => group.paths.some(path => path === pathname || (path !== "/admin" && pathname.startsWith(`${path}/`))));
  const relatedPaths = workflow?.paths.filter(path => canAccessAdminPath(user, path)) ?? [];
  const related = workflow && relatedPaths.length > 1 ? { ...workflow, paths: relatedPaths } : undefined;
  const results = ADMIN_PAGES.filter(page => canAccessAdminPath(user, page.href) && `${page.label} ${page.description}`.toLowerCase().includes(query.toLowerCase().trim()));
  const favorites = accessibleLinks.filter(link => pinned.includes(link.href));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openFinder();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openFinder]);

  useEffect(() => {
    drawer.current?.close();
    finder.current?.close();
    main.current?.scrollTo({ top: 0 });
  }, [pathname]);

  const navLink = (link: typeof ADMIN_LINKS[number], compact = false) => {
    const active = isLinkActive(pathname, link.href) && !accessibleLinks.some(other => other.href !== link.href && other.href.startsWith(`${link.href}/`) && isLinkActive(pathname, other.href));
    const Icon = link.icon;
    return <div key={link.href} className="admin-nav-row">
      <Link href={link.href} aria-current={active ? "page" : undefined} title={compact ? link.label : undefined} className="admin-nav-link" onClick={() => drawer.current?.close()}>
        <Icon size={19} aria-hidden="true" />
        <span className={compact ? "sr-only" : "admin-nav-label"}>{link.label}</span>
        {!compact && link.href === "/admin/feel" && attention.feel > 0 && <span className="admin-nav-count">{formatBadgeCount(attention.feel)}</span>}
      </Link>
      {!compact && <button type="button" className="admin-pin" aria-label={`${pinned.includes(link.href) ? "Unpin" : "Pin"} ${link.label}`} aria-pressed={pinned.includes(link.href)} onClick={() => togglePin(link.href)}><Pin size={14} aria-hidden="true" /></button>}
    </div>;
  };

  const navigation = (compact = false) => <>
    {!!favorites.length && !compact && <section className="admin-nav-group"><h2>Pinned by you</h2>{favorites.map(link => navLink(link))}</section>}
    {Object.entries(ADMIN_GROUPS).map(([key, group]) => {
      const links = accessibleLinks.filter(link => link.group === key && (compact || !pinned.includes(link.href)));
      if (links.length === 0) return null;
      return <section key={key} className="admin-nav-group">
        {!compact && <h2>{group.label}</h2>}
        {links.map(link => navLink(link, compact))}
      </section>;
    })}
  </>;

  return <TenantBrandProvider value={brand}>
    <div className="shell-grid-admin admin-workspace" data-collapsed={hydrated && collapsed ? "true" : "false"} data-theme={theme.hydrated ? theme.resolved : undefined}>
      <a className="skip-link" href="#admin-main">Skip to workspace</a>
      <aside className="shell-sidebar admin-rail hidden lg:flex">
        <div className="admin-rail-brand">
          <Link href="/admin" className="admin-brand-mark" aria-label={`${brand.name} workspace home`}>Rx</Link>
          {!collapsed && <div className="min-w-0 flex-1"><p className="truncate font-semibold admin-text">{brand.name}</p><p className="text-xs admin-muted">Pharmacy workspace</p></div>}
        </div>
        {!collapsed && (user.memberships.length > 1 || user.platformAdmin) && <div className="px-4 pb-3"><PharmacySwitcher user={user} compact /></div>}
        <button className="admin-rail-search" onClick={openFinder} aria-label="Find a page. Control or Command K"><Search size={18} aria-hidden="true" />{!collapsed && <><span>Find a page</span><kbd>⌘ K</kbd></>}</button>
        <nav aria-label="Main workspace navigation" className="admin-rail-scroll">{navigation(collapsed)}</nav>
        <div className="admin-rail-footer">
          <Link href={brand.slug ? `/p/${brand.slug}` : "/"} aria-label="View pharmacy website"><Home size={18} aria-hidden="true" />{!collapsed && <span>View website</span>}</Link>
          <button onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}{!collapsed && <span>Collapse navigation</span>}</button>
        </div>
      </aside>

      <header className="shell-header admin-workspace-header">
        <button type="button" className="btn-icon-admin lg:hidden" onClick={() => drawer.current?.showModal()} aria-label="Open navigation"><Menu size={20} /></button>
        <nav aria-label="Breadcrumb" className="admin-breadcrumb"><Link href="/admin">Workspace</Link>{pathname !== "/admin" && <><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">{current.label}</span></>}</nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button type="button" className="btn-icon-admin" onClick={openFinder} aria-label="Search admin pages"><Search size={18} /></button>
          <ThemeToggle mode={theme.mode} resolved={theme.resolved} onCycle={theme.cycle} />
          <AdminBellButton unread={attention.count} />
          <AdminUserMenu user={user} />
        </div>
      </header>

      <main ref={main} id="admin-main" tabIndex={-1} className="shell-main scroll-admin">
        <div className="page-container-admin admin-workspace-content">
          <div className="admin-page-heading">
            <div className="min-w-0"><p className="admin-eyebrow">{related?.label || "Your pharmacy"}</p><h1>{title || current.label}</h1><p className="admin-page-description">{subtitle || current.description}</p></div>
            {actions && <div className="admin-page-actions">{actions}</div>}
          </div>
          {related && <nav aria-label={`${related.label} pages`} className="admin-context-nav">{related.paths.map(path => {
            const page = adminPageForPath(path);
            const active = pathname === path || (pathname.startsWith(`${path}/`) && !related.paths.some(other => other !== path && pathname.startsWith(other)));
            return <Link key={path} href={path} aria-current={active ? "page" : undefined}>{page.label}</Link>;
          })}</nav>}
          <div className="admin-page-body">{children}</div>
        </div>
      </main>

      <dialog ref={drawer} className="admin-nav-dialog" aria-labelledby="admin-navigation-title" onClick={event => { if (event.target === event.currentTarget) drawer.current?.close(); }}>
        <div className="admin-dialog-heading"><div><h2 id="admin-navigation-title">Your workspace</h2><p>{brand.name}</p></div><button type="button" className="btn-icon-admin" onClick={() => drawer.current?.close()} aria-label="Close navigation"><X size={20} /></button></div>
        <div className="px-4 pb-3"><PharmacySwitcher user={user} /></div>
        <nav aria-label="Mobile workspace navigation" className="admin-rail-scroll">{navigation()}</nav>
      </dialog>
      <dialog ref={finder} className="admin-finder-dialog" aria-labelledby="admin-finder-title" onClick={event => { if (event.target === event.currentTarget) finder.current?.close(); }}>
        <div className="admin-dialog-heading"><h2 id="admin-finder-title">Where do you want to go?</h2><button className="btn-icon-admin" onClick={() => finder.current?.close()} aria-label="Close page search"><X size={20} /></button></div>
        <div className="px-5 pb-4"><label htmlFor="admin-page-search" className="sr-only">Search pages and tasks</label><input id="admin-page-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try prescriptions, stock, bookings…" className="input-admin" /></div>
        <p role="status" className="px-5 pb-2 text-xs admin-muted">{results.length} {results.length === 1 ? "page" : "pages"} · Tab to a result, then Enter to open</p>
        <nav aria-label="Page search results" className="admin-finder-results">{results.map(page => <Link href={page.href} key={page.href} onClick={() => finder.current?.close()}><span><strong>{page.label}</strong><small>{page.description}</small></span><ChevronRight size={18} aria-hidden="true" /></Link>)}{results.length === 0 && <p className="p-5 admin-muted">No pages match “{query}”. Try a task such as stock or refills.</p>}</nav>
      </dialog>
      <PushNotificationCenter audience="admin" />
      <LiveAlertCenter audience="admin" />
    </div>
  </TenantBrandProvider>;
}

function ThemeToggle({
  mode,
  resolved,
  onCycle,
}: {
  mode: ThemeMode;
  resolved: "light" | "dark";
  onCycle: () => void;
}) {
  const label =
    mode === "system"
      ? `Theme: system (${resolved})`
      : mode === "dark"
      ? "Theme: dark"
      : "Theme: light";
  const Icon = mode === "system" ? Monitor : resolved === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={onCycle}
      className="btn-icon-admin"
      aria-label={label}
      title={`${label} — click to cycle`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function AdminBellButton({ unread }: { unread: number }) {
  return (
    <Link
      href="/admin/inbox"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl admin-muted transition hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] border border-[var(--admin-border)]"
      aria-label={`Notifications${unread ? ` · ${unread} unread` : ""}`}
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-bold text-white shadow-sm">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

function AdminUserMenu({ user }: { user: SessionUser }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const membership = user.memberships.find(item => item.pharmacyId === user.activePharmacyId) || user.memberships[0];
  const initials = (user.fullName || user.email || "Staff").split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join("");
  const canManagePharmacy = canAccessAdminPath(user, "/admin/settings/location");
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (menu.current?.open && event.target instanceof Node && !menu.current.contains(event.target)) menu.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  return <details ref={menu} className="admin-account" onKeyDown={event => {
    if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); }
  }}>
    <summary aria-label={`Account options for ${user.fullName || "staff"}`}><span className="admin-account-avatar">{initials}</span><span className="hidden md:block">{user.fullName || "Staff"}</span><ChevronDown size={14} aria-hidden="true" /></summary>
    <div className="admin-account-panel">
      <p className="font-semibold admin-text">{user.fullName || "Staff"}</p><p className="break-all text-xs admin-muted">{user.email}</p>
      <p className="mb-3 mt-2 text-xs capitalize admin-accent-text">{membership?.role || user.role}</p>
      <Link href={membership?.slug ? `/p/${membership.slug}` : "/"}>View pharmacy website</Link>
      {canManagePharmacy && <Link href="/admin/settings/location">Pharmacy details</Link>}
      <form action={logoutAction}><button type="submit">Sign out</button></form>
    </div>
  </details>;
}
