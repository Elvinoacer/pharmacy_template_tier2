"use client";

import Link from "next/link";
import { switchPharmacyAction } from "@/app/actions/tenant-admin";
import type { SessionUser } from "@/app/lib/types";

export function PharmacySwitcher({ user, compact }: { user: SessionUser; compact?: boolean }) {
  const current =
    user.memberships.find((m) => m.pharmacyId === user.activePharmacyId) || user.memberships[0];
  if (!current && !user.platformAdmin) return null;
  if (user.memberships.length <= 1 && !user.platformAdmin) {
    return (
      <p className={compact ? "truncate text-xs font-semibold text-emerald-700" : "truncate text-xs text-emerald-800"}>
        {current?.name || "Pharmacy"}
      </p>
    );
  }
  if (user.platformAdmin && user.memberships.length === 0) {
    return (
      <Link
        href="/admin/select"
        className={compact ? "text-xs font-semibold text-emerald-700 underline" : "text-xs text-emerald-800 underline"}
      >
        Choose pharmacy
      </Link>
    );
  }
  return (
    <form action={switchPharmacyAction} className="min-w-0">
      <select
        name="pharmacyId"
        defaultValue={current?.pharmacyId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="max-w-full truncate rounded-lg border border-[var(--admin-border)] bg-[var(--admin-inset)] px-2 py-1 text-xs font-semibold admin-text"
        title="Switch pharmacy"
        aria-label="Active pharmacy"
      >
        {user.memberships.map((m) => (
          <option key={m.pharmacyId} value={m.pharmacyId}>
            {m.name}
          </option>
        ))}
      </select>
    </form>
  );
}
