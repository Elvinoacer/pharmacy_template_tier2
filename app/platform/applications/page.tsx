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
      : {
          status: {
            in: ["submitted", "under_review", "needs_info", "draft"] as PharmacyStatus[],
          },
        }),
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
    <div className="space-y-5 sm:space-y-6">
      <header className="overflow-hidden rounded-2xl border border-[#d7e5de] bg-[linear-gradient(145deg,#ffffff_0%,#f4fbf7_65%,#eaf7f1_100%)] px-4 py-5 shadow-sm shadow-black/[0.025] dark:border-teal-300/20 dark:bg-[linear-gradient(145deg,rgba(13,93,76,.35),rgba(6,17,15,.76)_58%,rgba(255,255,255,.03))] dark:shadow-none sm:rounded-3xl sm:px-6 sm:py-6 md:px-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700/80 dark:text-teal-200/75">
              Verification
            </p>
            <h1
              className="mt-1 text-2xl font-semibold tracking-tight text-[#14211d] dark:text-white sm:text-3xl md:text-4xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Application queue
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f7068] dark:text-teal-50/75">
              Work the highest-risk submissions first, then verify licence, location pin and contact
              details before approval.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <div className="rounded-xl border border-[#dce7e1] bg-white/80 px-3 py-2.5 text-center dark:border-white/10 dark:bg-white/[0.05]">
              <p className="text-lg font-semibold tabular-nums text-[#14211d] dark:text-white">
                {sorted.length}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#75827c] dark:text-teal-100/60">
                Queue
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/85 px-3 py-2.5 text-center dark:border-amber-400/25 dark:bg-amber-400/10">
              <p className="text-lg font-semibold tabular-nums text-amber-900 dark:text-amber-100">
                {highCount}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-200/70">
                High
              </p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/85 px-3 py-2.5 text-center dark:border-rose-400/25 dark:bg-rose-400/10">
              <p className="text-lg font-semibold tabular-nums text-rose-900 dark:text-rose-100">
                {criticalCount}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-rose-700 dark:text-rose-200/70">
                Urgent
              </p>
            </div>
          </div>
        </div>
      </header>

      <section
        aria-label="Application filters"
        className="rounded-2xl border border-[#dce7e1] bg-white/75 p-3 shadow-sm shadow-black/[0.02] dark:border-teal-200/15 dark:bg-teal-950/25 dark:shadow-none sm:p-4"
      >
        <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max min-w-full gap-1.5">
            {STATUS_TABS.map((tab) => {
              const href = tab.value
                ? `/platform/applications?status=${tab.value}`
                : "/platform/applications";
              const active = status === tab.value;
              return (
                <Link
                  key={tab.value}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`min-h-10 shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:focus-visible:ring-teal-300 ${
                    active
                      ? "border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-300/30 dark:bg-teal-300/15 dark:text-white"
                      : "border-transparent bg-[#f4f7f5] text-[#5f7068] hover:border-[#d9e6df] hover:text-[#203c31] dark:bg-white/[0.035] dark:text-teal-100/70 dark:hover:border-white/10 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        <form method="GET" className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#87938e] dark:text-teal-100/40" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search pharmacy, licence or city…"
              aria-label="Search applications"
              className="h-11 w-full rounded-xl border border-[#d7e2dc] bg-white pl-9 pr-3 text-sm text-[#1c2c26] outline-none transition placeholder:text-[#8b9792] focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 dark:border-white/15 dark:bg-black/20 dark:text-white dark:placeholder:text-teal-100/40 dark:focus:border-teal-300/45 dark:focus:ring-teal-300/10"
            />
          </div>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-teal-200 dark:text-[#06110f] dark:hover:bg-teal-100 dark:focus-visible:ring-teal-200 dark:focus-visible:ring-offset-[#06110f]"
          >
            Search queue
          </button>
        </form>
      </section>

      <section aria-label="Application results" className="space-y-2.5">
        {sorted.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#cfded7] bg-white/55 px-5 py-12 text-center dark:border-white/15 dark:bg-white/[0.025] sm:px-6 sm:py-14">
            <p className="text-sm font-semibold text-[#22372e] dark:text-teal-50/90">Queue is clear</p>
            <p className="mt-1 text-xs text-[#75827c] dark:text-teal-100/55">
              No applications match the current filter.
            </p>
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
              className={`group block rounded-2xl border p-4 shadow-sm shadow-black/[0.02] transition duration-200 active:scale-[0.995] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:shadow-none dark:focus-visible:ring-teal-300 sm:p-5 ${
                priority === "critical"
                  ? "border-rose-200 bg-rose-50/65 hover:border-rose-300 dark:border-rose-400/30 dark:bg-rose-500/10 dark:hover:bg-rose-500/15"
                  : priority === "high"
                    ? "border-amber-200 bg-amber-50/60 hover:border-amber-300 dark:border-amber-400/25 dark:bg-amber-500/[0.07] dark:hover:bg-amber-500/10"
                    : "border-[#dce7e1] bg-white hover:border-teal-200 hover:bg-[#fbfdfc] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-teal-300/25 dark:hover:bg-white/[0.055]"
              }`}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate text-base font-semibold text-[#14211d] dark:text-white">
                      {p.name}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priorityBadgeClass(priority)}`}
                    >
                      {priorityLabel(priority)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-[#6d7d75] dark:text-teal-100/60">
                    /p/{p.slug}
                    {p.city ? ` · ${p.city}` : ""}
                  </p>
                </div>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#9aa59f] transition group-hover:translate-x-0.5 group-hover:text-teal-700 dark:text-teal-200/45 dark:group-hover:text-teal-100" aria-hidden />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                <span className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(p.status)}`}>
                  {formatStatus(p.status)}
                </span>
                <span className="text-right text-xs font-medium tabular-nums text-[#63736b] dark:text-teal-100/60 sm:text-left">
                  {age == null ? "Date unavailable" : age === 0 ? "Submitted today" : `${age}d waiting`}
                </span>
                <span className={`text-xs ${p.licenseNumber ? "text-[#53645c] dark:text-teal-100/65" : "font-medium text-amber-700 dark:text-amber-200"}`}>
                  {p.licenseNumber ? `Licence ${p.licenseNumber}` : "Licence missing"}
                </span>
                <span className={`text-right text-xs sm:text-left ${hasPin ? "text-[#53645c] dark:text-teal-100/65" : "font-medium text-amber-700 dark:text-amber-200"}`}>
                  {hasPin ? "Location pinned" : "Pin missing"}
                </span>
              </div>

              {(priority === "critical" || priority === "high") && (
                <div className="mt-3 flex items-center gap-2 border-t border-current/10 pt-3 text-xs font-medium text-[#56665f] dark:text-teal-50/70">
                  {priority === "critical" ? (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-300" aria-hidden />
                  ) : (
                    <Clock3 className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden />
                  )}
                  Prioritise this review before lower-risk submissions.
                </div>
              )}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
