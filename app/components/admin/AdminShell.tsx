"use client";

import React from "react";
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
  Home,
  Package,
  HeartPulse,
  Stethoscope,
  ShoppingCart,
  RefreshCw,
  TrendingUp,
  ClipboardCheck,
  Settings,
  Activity,
  Boxes,
  Syringe,
  Palette,
} from "lucide-react";
import type { SessionUser } from "@/app/lib/types";
import { PharmacySwitcher } from "@/app/components/admin/PharmacySwitcher";
import { WorkspaceShell } from "@/app/components/workspace/WorkspaceShell";
import { ADMIN_PAGES, ADMIN_WORKFLOWS, adminPageForPath } from "./admin-pages";

export { ADMIN_PAGES, ADMIN_WORKFLOWS, adminPageForPath };

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

export function AdminShell({
  user,
  children,
  title,
  subtitle,
  actions,
}: {
  user: SessionUser;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const membership =
    user.memberships.find((m) => m.pharmacyId === user.activePharmacyId) ||
    user.memberships[0];

  const brand = {
    name: membership?.name || "Pharmacy",
    network: "Afyvia Pharmacy Network",
    slug: membership?.slug || null,
  };

  const hasMultiplePharmacies = user.memberships.length > 1 || user.platformAdmin;
  const pharmacySwitcher = hasMultiplePharmacies ? (
    <PharmacySwitcher user={user} compact />
  ) : undefined;

  return (
    <WorkspaceShell
      role="admin"
      user={user}
      brand={brand}
      title={title}
      subtitle={subtitle}
      actions={actions}
      pharmacySwitcher={pharmacySwitcher}
      headerExtra={pharmacySwitcher}
    >
      {children}
    </WorkspaceShell>
  );
}
