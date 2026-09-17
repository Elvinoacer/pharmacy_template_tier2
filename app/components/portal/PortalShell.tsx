"use client";

import React from "react";
import {
  LayoutDashboard,
  Pill,
  FileText,
  HeartHandshake,
  MessageSquare,
  Sparkles,
  Settings,
  User,
  Star,
  ShoppingCart,
  HeartPulse,
  Calendar,
  RefreshCw,
  Activity,
  Syringe,
  Store,
} from "lucide-react";
import type { SessionUser } from "@/app/lib/types";
import { WorkspaceShell } from "@/app/components/workspace/WorkspaceShell";
import { useTenantBrand } from "@/app/components/TenantBrand";

export const PORTAL_LINKS = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard, group: "overview" },
  { href: "/portal/pharmacies", label: "Nearby pharmacies", icon: Store, group: "overview" },
  { href: "/portal/refills", label: "Refills", icon: Pill, group: "medications" },
  { href: "/portal/prescriptions", label: "Prescriptions", icon: FileText, group: "medications" },
  { href: "/portal/calendar", label: "Medication Calendar", icon: Calendar, group: "medications" },
  { href: "/portal/sync", label: "Align refill dates", icon: RefreshCw, group: "medications" },
  { href: "/portal/counselling", label: "Medicine advice", icon: HeartPulse, group: "medications" },
  { href: "/portal/orders", label: "Orders", icon: ShoppingCart, group: "orders" },
  { href: "/portal/screenings", label: "Health Screenings", icon: Activity, group: "health" },
  { href: "/portal/vaccinations", label: "Vaccinations", icon: Syringe, group: "health" },
  { href: "/portal/preventive", label: "Preventive care", icon: HeartPulse, group: "health" },
  { href: "/portal/feel", label: "How do you feel?", icon: HeartPulse, group: "health" },
  { href: "/portal/caregivers", label: "Caregivers", icon: HeartHandshake, group: "health" },
  { href: "/portal/messages", label: "Messages", icon: MessageSquare, group: "communication" },
  { href: "/portal/loyalty", label: "Loyalty", icon: Sparkles, group: "rewards" },
  { href: "/portal/preferences", label: "Preferences", icon: Settings, group: "settings" },
  { href: "/portal/profile", label: "Profile", icon: User, group: "settings" },
  { href: "/portal/feedback", label: "Feedback", icon: Star, group: "settings" },
] as const;

export const PORTAL_GROUPS = {
  overview: { label: "Overview", icon: LayoutDashboard },
  medications: { label: "Medications", icon: Pill },
  orders: { label: "Orders & Shopping", icon: ShoppingCart },
  health: { label: "Health & Care", icon: HeartPulse },
  communication: { label: "Communication", icon: MessageSquare },
  rewards: { label: "Rewards", icon: Sparkles },
  settings: { label: "Settings", icon: Settings },
} as const;

export { StatCard, Panel, Badge, EmptyState } from "@/app/components/portal/PortalWidgets";

export function PortalShell({
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
  const brand = useTenantBrand();

  return (
    <WorkspaceShell
      role="portal"
      user={user}
      brand={brand}
      title={title}
      subtitle={subtitle}
      actions={actions}
    >
      {children}
    </WorkspaceShell>
  );
}
