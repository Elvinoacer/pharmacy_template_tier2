import Link from "next/link";
import { prismaUnscoped } from "@/app/lib/db";
import type { PharmacyStatus } from "@/app/generated/prisma/client";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";

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
    <div>
      <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>
        All pharmacies
      </h1>
      <p className="mt-2 text-sm text-teal-100/70">{total} tenants match — search, then open a tenant to edit, list, or suspend.</p>

      <form method="GET" className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name, slug, city, county, email…"
          aria-label="Search pharmacies"
          className="h-11 flex-1 rounded-xl border border-white/15 bg-black/30 px-4 text-sm outline-none placeholder:text-teal-100/40 focus:border-teal-300/40"
        />
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
        <button type="submit" className="h-11 rounded-xl bg-white/10 px-5 text-sm font-semibold hover:bg-white/15">
          Filter
        </button>
      </form>

      <div className="mt-6 grid gap-3">
        {rows.map((p) => (
          <Link
            key={p.id}
            href={`/platform/pharmacies/${p.id}`}
            className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium">{p.name}</p>
              <p className="truncate text-xs text-teal-100/55">
                /p/{p.slug} · {[p.city, p.county].filter(Boolean).join(", ")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase">
              {p.featured && <span className="text-amber-200">Featured</span>}
              {p.listed && <span className="text-emerald-300">Listed</span>}
              <span className="rounded-full border border-white/15 px-2 py-0.5">{p.status.replace("_", " ")}</span>
            </div>
          </Link>
        ))}
        {rows.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-teal-100/60">
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
