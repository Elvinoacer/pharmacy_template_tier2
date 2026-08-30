import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock3, Search } from "lucide-react";
import { prismaUnscoped } from "@/app/lib/db";
import type { PharmacyStatus } from "@/app/generated/prisma/client";
import {
  daysSince,
  formatStatus,
  priorityBadgeClass,
  priorityLabel,
  statusBadgeClass,
  verificationPriority,
} from "@/app/components/platform/status";

export const metadata = { title: "Applications" };
export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { value: "", label: "Whole queue" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "needs_info", label: "Needs info" },
  { value: "draft", label: "Drafts" },
] as const;

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = (params.status || "").trim();
  const q = (params.q || "").trim();

  const where = {
    ...(status
      ? { status: status as PharmacyStatus }
      : { status: { in: ["submitted", "under_review", "needs_info", "draft"] as PharmacyStatus[] } }),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { licenseNumber: { contains: q, mode: "insensitive" as const } },
            { city: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const rows = await prismaUnscoped.pharmacy
    .findMany({
      where,
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        city: true,
        licenseNumber: true,
        submittedAt: true,
        createdAt: true,
        latitude: true,
        longitude: true,
      },
    })
    .catch(() => []);

  const sorted = [...rows].sort((a, b) => {
    const pa = verificationPriority(a.status, a.submittedAt, a.createdAt);
    const pb = verificationPriority(b.status, b.submittedAt, b.createdAt);
    const rank = { critical: 0, high: 1, normal: 2, low: 3 } as const;
    return rank[pa] - rank[pb];
  });

  const criticalCount = sorted.filter(
    (p) => verificationPriority(p.status, p.submittedAt, p.createdAt) === "critical",
  ).length;
  const highCount = sorted.filter(
    (p) => verificationPriority(p.status, p.submittedAt, p.createdAt) === "high",
  ).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-100/70">
            Verification
          </p>
          <h1
            className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Application queue
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-teal-50/75">
            Prioritise by urgency. Submitted applications aging past 2–5 days rise to high or urgent.
            Open a row to verify licence, pin, and contact details.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {criticalCount > 0 && (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold ${priorityBadgeClass("critical")}`}>
              <AlertTriangle className="h-3.5 w-3.5" />
              {criticalCount} urgent
            </span>
          )}
          {highCount > 0 && (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold ${priorityBadgeClass("high")}`}>
              <Clock3 className="h-3.5 w-3.5" />
              {highCount} high priority
            </span>
          )}
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-teal-50/80">
            {sorted.length} in queue
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((t) => {
            const href = t.value
              ? `/platform/applications?status=${t.value}`
              : "/platform/applications";
            const active = status === t.value;
            return (
              <Link
                key={t.value}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-white/40 bg-white/15 text-white"
                    : "border-white/15 text-teal-100/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
        <form method="GET" className="flex min-w-0 flex-1 gap-2 sm:ml-auto sm:max-w-sm">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-teal-100/40" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search name, licence, city…"
              aria-label="Search applications"
              className="h-10 w-full rounded-xl border border-white/15 bg-black/30 pl-9 pr-3 text-sm outline-none placeholder:text-teal-100/40 focus:border-teal-300/40"
            />
          </div>
          <button
            type="submit"
            className="h-10 shrink-0 rounded-xl bg-white/10 px-4 text-xs font-semibold hover:bg-white/15"
          >
            Search
          </button>
        </form>
      </div>

      <div className="space-y-2">
        {sorted.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center">
            <p className="text-sm font-medium text-teal-50/90">Queue is clear</p>
            <p className="mt-1 text-xs text-teal-100/55">No applications match this filter.</p>
          </div>
        )}
        {sorted.map((p) => {
          const age = daysSince(p.submittedAt ?? p.createdAt);
          const priority = verificationPriority(p.status, p.submittedAt, p.createdAt);
          const hasPin = p.latitude != null && p.longitude != null;
          return (
            <Link
              key={p.id}
              href={`/platform/pharmacies/${p.id}`}
              className={`group flex flex-col gap-3 rounded-2xl border px-4 py-4 transition hover:-translate-y-0.5 hover:bg-white/[0.06] sm:flex-row sm:items-center sm:justify-between ${
                priority === "critical"
                  ? "border-rose-400/35 bg-rose-500/10"
                  : priority === "high"
                    ? "border-amber-400/30 bg-amber-500/5"
                    : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-semibold text-white">{p.name}</p>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priorityBadgeClass(priority)}`}
                  >
                    {priorityLabel(priority)}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-teal-100/60">
                  /p/{p.slug}
                  {p.city ? ` · ${p.city}` : ""}
                  {p.licenseNumber ? ` · Licence ${p.licenseNumber}` : " · No licence on file"}
                  {!hasPin ? " · Pin missing" : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="text-xs tabular-nums text-teal-100/60">
                  {age == null ? "—" : age === 0 ? "Today" : `${age}d ago`}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(p.status)}`}
                >
                  {formatStatus(p.status)}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-100 opacity-0 transition group-hover:opacity-100">
                  Review <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
