"use client";

import React from "react";
import {
  HeartHandshake,
  Users,
  Pill,
  Bell,
  Activity,
  Clock,
  ClipboardCheck,
  CalendarCheck,
} from "lucide-react";
import type { SessionUser } from "@/app/lib/types";
import { WorkspaceShell } from "@/app/components/workspace/WorkspaceShell";
import { useTenantBrand } from "@/app/components/TenantBrand";

export const CAREGIVER_LINKS = [
  { href: "/caregiver", label: "Dashboard", icon: HeartHandshake, group: "overview" },
  { href: "/caregiver/patients", label: "My Patients", icon: Users, group: "patients" },
  { href: "/caregiver/refills", label: "Refill Requests", icon: Pill, group: "medications" },
  { href: "/caregiver/reminders", label: "Reminders", icon: Clock, group: "schedule" },
  { href: "/caregiver/notifications", label: "Notifications", icon: Bell, group: "communication" },
  { href: "/caregiver/adherence", label: "Adherence", icon: Activity, group: "reports" },
] as const;

export const CAREGIVER_GROUPS = {
  overview: { label: "Overview", icon: HeartHandshake },
  patients: { label: "Patients", icon: Users },
  medications: { label: "Medications", icon: Pill },
  schedule: { label: "Schedule", icon: CalendarCheck },
  communication: { label: "Communication", icon: Bell },
  reports: { label: "Reports", icon: ClipboardCheck },
} as const;

export function CaregiverShell({
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
      role="caregiver"
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
