import Link from "next/link";
import { Search } from "lucide-react";
import { prismaUnscoped } from "@/app/lib/db";
import type { PharmacyStatus } from "@/app/generated/prisma/client";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";
import {
  formatStatus,
  statusBadgeClass,
} from "@/app/components/platform/status";

export const metadata = { title: "Pharmacies" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "approved", label: "Approved (pre-launch)" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "needs_info", label: "Needs info" },
  { value: "draft", label: "Draft" },
  { value: "rejected", label: "Rejected" },
];

export default async function PharmaciesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const status = (params.status || "").trim();

  const where = {
    ...(status ? { status: status as PharmacyStatus } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { city: { contains: q, mode: "insensitive" as const } },
            { county: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const total = await prismaUnscoped.pharmacy.count({ where }).catch(() => 0);
  const page = parsePageParam(params.page, total, PAGE_SIZE);
  const rows = await prismaUnscoped.pharmacy
    .findMany({
      where,
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    })
    .catch(() => []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-100/70">Tenants</p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          All pharmacies
        </h1>
        <p className="mt-2 text-sm text-teal-100/70">
          {total} tenant{total === 1 ? "" : "s"} match — open a row to verify, list, or suspend.
        </p>
      </header>

      <form method="GET" className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-100/40" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name, slug, city, county, email…"
            aria-label="Search pharmacies"
            className="h-11 w-full rounded-xl border border-white/15 bg-black/30 pl-10 pr-4 text-sm outline-none placeholder:text-teal-100/40 focus:border-teal-300/40"
          />
        </div>
        <select
          name="status"
          defaultValue={status}
          aria-label="Filter by status"
          className="h-11 rounded-xl border border-white/15 bg-[#071512] px-3 text-sm"
        >
          {STATUS_TABS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-11 rounded-xl bg-white/10 px-5 text-sm font-semibold hover:bg-white/15"
        >
          Filter
        </button>
      </form>

      <div className="grid gap-2">
        {rows.map((p) => (
          <Link
            key={p.id}
            href={`/platform/pharmacies/${p.id}`}
            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 transition hover:border-white/20 hover:bg-white/[0.07] sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-semibold text-white">{p.name}</p>
              <p className="mt-0.5 truncate text-xs text-teal-100/55">
                /p/{p.slug} · {[p.city, p.county].filter(Boolean).join(", ") || "No location"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
              {p.featured && (
                <span className="rounded-full border border-amber-400/30 px-2 py-0.5 text-amber-200">
                  Featured
                </span>
              )}
              {p.listed && (
                <span className="rounded-full border border-emerald-400/30 px-2 py-0.5 text-emerald-200">
                  Listed
                </span>
              )}
              <span className={`rounded-full border px-2.5 py-1 ${statusBadgeClass(p.status)}`}>
                {formatStatus(p.status)}
              </span>
            </div>
          </Link>
        ))}
        {rows.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/15 px-4 py-12 text-center text-sm text-teal-100/60">
            No tenants match this search.
          </p>
        )}
      </div>

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/platform/pharmacies"
        queryParams={{ q: q || undefined, status: status || undefined }}
      />
    </div>
  );
}
