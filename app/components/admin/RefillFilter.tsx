"use client";

import Link from "next/link";
import { Pill, Clock, ListChecks, CheckCircle2, PackageCheck, XCircle } from "lucide-react";
import { REFILL_STATUSES } from "@/app/lib/types";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  submitted: Clock,
  under_review: ListChecks,
  approved: CheckCircle2,
  preparing: Pill,
  ready_for_pickup: PackageCheck,
  collected: CheckCircle2,
  cancelled: XCircle,
};

export function RefillFilter({
  counts,
  active,
  search,
}: {
  counts: Record<string, number>;
  active: string;
  search?: string;
}) {
  const searchParam = search ? `&q=${encodeURIComponent(search)}` : "";
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      <Link
        href={`/admin/refills${search ? `?q=${encodeURIComponent(search)}` : ""}`}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          active === "all"
            ? "bg-[#2dd4bf] text-[#042f2e]"
            : "bg-white/[0.04] text-[#ecfdf5]/70 hover:bg-white/[0.08] hover:text-white"
        }`}
      >
        All <span className="rounded-full bg-black/20 px-1.5 text-[10px]">{total}</span>
      </Link>
      {REFILL_STATUSES.map((s) => {
        const Icon = ICONS[s.value] || Pill;
        const isActive = active === s.value;
        const count = counts[s.value] || 0;
        return (
          <Link
            key={s.value}
            href={`/admin/refills?status=${s.value}${searchParam}`}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              isActive
                ? "bg-[#2dd4bf] text-[#042f2e]"
                : "bg-white/[0.04] text-[#ecfdf5]/70 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            <Icon className="h-3 w-3" />
            {s.label}
            <span className="rounded-full bg-black/20 px-1.5 text-[10px]">{count}</span>
          </Link>
        );
      })}
    </div>
  );
}
