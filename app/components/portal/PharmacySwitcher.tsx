"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import { useTenantBrand } from "@/app/components/TenantBrand";
import { usePortalPharmacies } from "@/app/components/portal/PortalPharmaciesContext";
import { setActivePharmacyAction } from "@/app/actions/portal";

/**
 * Header switcher for "one account, many pharmacies": shows the active
 * pharmacy and lets the customer jump between the pharmacies they use.
 * Per-pharmacy data elsewhere on the page follows the active selection.
 */
export default function PharmacySwitcher() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const brand = useTenantBrand();
  const pharmacies = usePortalPharmacies();
  const active = pharmacies.find((p) => p.slug === brand.slug) ?? null;

  if (pharmacies.length === 0) return null;

  const label = active?.name ?? "Choose pharmacy";

  function switchTo(slug: string) {
    setOpen(false);
    startTransition(async () => {
      await setActivePharmacyAction(slug);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        className="flex h-11 max-w-[125px] sm:max-w-[220px] items-center gap-1.5 rounded-full border border-teal-900/15 bg-white px-3 text-xs font-semibold text-[#084c3f] transition hover:bg-[#f0faf6] disabled:opacity-60"
        title="Switch active pharmacy"
      >
        <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] origin-top-right rounded-2xl border border-[#e3ebe6] bg-white p-2 shadow-xl animate-scale-in">
            <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-[#8a9a92]">
              Your pharmacies
            </p>
            <ul role="menu">
              {pharmacies.map((p) => {
                const isActive = p.slug === brand.slug;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      onClick={() => (isActive ? setOpen(false) : switchTo(p.slug))}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition ${
                        isActive ? "bg-[#e6f4ef] text-[#084c3f]" : "text-[#3d4f46] hover:bg-[#f0faf6]"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.name}</span>
                        {p.city && <span className="block truncate text-[11px] text-[#8a9a92]">{p.city}</span>}
                      </span>
                      {isActive && <Check className="h-4 w-4 shrink-0 text-[#0d6e5a]" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="my-1 h-px bg-[#e3ebe6]" />
            <Link
              href="/portal/pharmacies"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[#3d4f46] hover:bg-[#e6f4ef]"
            >
              <Plus className="h-4 w-4" aria-hidden /> Add or manage pharmacies
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
