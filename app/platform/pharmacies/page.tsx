import Link from "next/link";
import { ArrowUpRight, MapPin, Search, Store } from "lucide-react";
import { prismaUnscoped } from "@/app/lib/db";
import type { PharmacyStatus } from "@/app/generated/prisma/client";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";
import { formatStatus, statusBadgeClass } from "@/app/components/platform/status";

export const metadata = { title: "Pharmacies" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { value: "", label: "All statuses" },
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

  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200/70">
            Tenant operations
          </p>
          <h1
            className="mt-1 text-2xl font-semibold tracking-tight text-[#14211b] dark:text-white sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Pharmacies
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68776e] dark:text-teal-100/65">
            Find a tenant quickly, inspect verification state, and open the pharmacy record for support or lifecycle actions.
          </p>
        </div>
        <div className="flex shrink-0 items-baseline gap-1 rounded-2xl border border-[#dce7e1] bg-white px-3.5 py-2.5 shadow-sm dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none">
          <span className="text-xl font-semibold tabular-nums text-[#17231d] dark:text-white">{total}</span>
          <span className="text-xs text-[#718078] dark:text-teal-100/55">matching</span>
        </div>
      </header>

      <form
        method="GET"
        className="grid gap-2.5 rounded-2xl border border-[#dce7e1] bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-center"
      >
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7b8981] dark:text-teal-100/40" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name, slug, city, county, email…"
            aria-label="Search pharmacies"
            className="h-11 w-full rounded-xl border border-[#cfdcd4] bg-[#fbfdfb] pl-10 pr-4 text-sm text-[#17231d] outline-none transition placeholder:text-[#8d9992] focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 dark:border-white/15 dark:bg-black/25 dark:text-white dark:placeholder:text-teal-100/35 dark:focus:border-teal-300/50 dark:focus:ring-teal-300/10"
          />
        </div>
        <select
          name="status"
          defaultValue={status}
          aria-label="Filter by status"
          className="h-11 w-full rounded-xl border border-[#cfdcd4] bg-[#fbfdfb] px-3 text-sm text-[#26352d] outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 dark:border-white/15 dark:bg-[#071512] dark:text-white dark:focus:border-teal-300/50 dark:focus:ring-teal-300/10"
        >
          {STATUS_TABS.map((tab) => (
            <option key={tab.value} value={tab.value}>
              {tab.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:bg-teal-300 dark:text-teal-950 dark:hover:bg-teal-200 dark:focus-visible:ring-teal-300 dark:focus-visible:ring-offset-[#06110f]"
        >
          Apply filters
        </button>
      </form>

      <div className="flex items-center justify-between gap-3 text-xs text-[#74837a] dark:text-teal-100/50">
        <p>{total ? `Showing ${start}–${end} of ${total}` : "No matching tenants"}</p>
        {(q || status) && (
          <Link
            href="/platform/pharmacies"
            className="font-semibold text-teal-700 underline-offset-4 hover:underline dark:text-teal-200"
          >
            Clear filters
          </Link>
        )}
      </div>

      <div className="grid gap-2.5 lg:grid-cols-2">
        {rows.map((pharmacy) => (
          <Link
            key={pharmacy.id}
            href={`/platform/pharmacies/${pharmacy.id}`}
            className="group min-w-0 rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md active:translate-y-0 dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none dark:hover:border-teal-300/25 dark:hover:bg-white/[0.05] sm:p-4.5"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#17231d] dark:text-white">{pharmacy.name}</p>
                <p className="mt-1 break-all text-xs text-[#718078] dark:text-teal-100/50">/p/{pharmacy.slug}</p>
              </div>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f3f7f4] text-[#708078] transition group-hover:bg-teal-50 group-hover:text-teal-700 dark:bg-white/5 dark:text-teal-100/50 dark:group-hover:bg-teal-300/10 dark:group-hover:text-teal-200">
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </span>
            </div>

            <div className="mt-3 flex min-w-0 items-center gap-1.5 text-xs text-[#66766d] dark:text-teal-100/60">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {[pharmacy.city, pharmacy.county].filter(Boolean).join(", ") || "No location recorded"}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
              <span className={`rounded-full border px-2.5 py-1 ${statusBadgeClass(pharmacy.status)}`}>
                {formatStatus(pharmacy.status)}
              </span>
              {pharmacy.listed && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
                  Listed
                </span>
              )}
              {pharmacy.featured && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
                  Featured
                </span>
              )}
            </div>
          </Link>
        ))}

        {rows.length === 0 && (
          <div className="lg:col-span-2 rounded-2xl border border-dashed border-[#cfdcd4] bg-white px-4 py-12 text-center dark:border-white/15 dark:bg-white/[0.025]">
            <Store className="mx-auto h-6 w-6 text-[#839088] dark:text-teal-100/40" aria-hidden />
            <p className="mt-3 text-sm font-medium text-[#53645a] dark:text-teal-100/70">No tenants match this search.</p>
            <Link
              href="/platform/pharmacies"
              className="mt-3 inline-flex min-h-10 items-center rounded-xl px-3 text-xs font-semibold text-teal-700 hover:bg-teal-50 dark:text-teal-200 dark:hover:bg-teal-300/10"
            >
              Reset filters
            </Link>
          </div>
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
