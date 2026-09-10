import Link from "next/link";
import { Search } from "lucide-react";
import { prismaUnscoped } from "@/app/lib/db";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";

export const metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

export default async function PlatformAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const actionFilter = (params.action || "").trim();

  const where = {
    ...(actionFilter
      ? { action: { contains: actionFilter, mode: "insensitive" as const } }
      : {}),
    ...(q
      ? {
          OR: [
            { action: { contains: q, mode: "insensitive" as const } },
            { entityType: { contains: q, mode: "insensitive" as const } },
            { actor: { is: { email: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };

  const total = await prismaUnscoped.auditLog.count({ where }).catch(() => 0);
  const page = parsePageParam(params.page, total, PAGE_SIZE);

  const rows = await prismaUnscoped.auditLog
    .findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { actor: { select: { email: true } } },
    })
    .catch(() => []);

  return (
    <PlatformPage
      eyebrow="Security history"
      title="Audit log"
      description="Trace privileged actions across verification, tenant administration, impersonation and user management."
    >
      <section className="mb-5 rounded-2xl border border-[#dce7e1] bg-white/75 p-3 shadow-sm shadow-black/[0.02] dark:border-teal-200/15 dark:bg-teal-950/25 dark:shadow-none sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#20332b] dark:text-white">Find an event</h2>
            <p className="mt-0.5 text-xs text-[#74817b] dark:text-teal-100/60">
              {total.toLocaleString("en-KE")} matching audit {total === 1 ? "event" : "events"}
            </p>
          </div>
          {(q || actionFilter) && (
            <Link
              href="/platform/audit"
              className="rounded-lg px-2.5 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-200 dark:hover:bg-teal-300/10 dark:focus-visible:ring-teal-300"
            >
              Clear
            </Link>
          )}
        </div>

        <form method="GET" className="grid gap-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(13rem,.65fr)_auto]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b9792] dark:text-teal-100/40" aria-hidden />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search action, entity or actor email…"
              aria-label="Search audit log"
              className="h-11 w-full rounded-xl border border-[#d7e2dc] bg-white pl-9 pr-3 text-sm text-[#1c2c26] outline-none transition placeholder:text-[#8b9792] focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 dark:border-white/15 dark:bg-black/20 dark:text-white dark:placeholder:text-teal-100/40 dark:focus:border-teal-300/45 dark:focus:ring-teal-300/10"
            />
          </div>
          <input
            type="search"
            name="action"
            defaultValue={actionFilter}
            placeholder="Action prefix, e.g. pharmacy."
            aria-label="Filter by action prefix"
            className="h-11 min-w-0 rounded-xl border border-[#d7e2dc] bg-white px-3 text-sm text-[#1c2c26] outline-none transition placeholder:text-[#8b9792] focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 dark:border-white/15 dark:bg-black/20 dark:text-white dark:placeholder:text-teal-100/40 dark:focus:border-teal-300/45 dark:focus:ring-teal-300/10"
          />
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white transition active:scale-[0.98] hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-teal-200 dark:text-[#06110f] dark:hover:bg-teal-100 dark:focus-visible:ring-teal-200 dark:focus-visible:ring-offset-[#06110f]"
          >
            Apply filters
          </button>
        </form>
      </section>

      <PlatformTable
        headers={["When", "Actor", "Action", "Entity", "Details"]}
        empty="No audit entries match the current filters."
        rows={rows.map((entry) => {
          const details =
            entry.details && typeof entry.details === "object" ? JSON.stringify(entry.details) : "—";
          return [
            <span key="when" className="whitespace-nowrap text-xs tabular-nums">
              {new Date(entry.createdAt).toLocaleString("en-KE")}
            </span>,
            <span key="actor" className="break-all text-xs">
              {entry.actor?.email || "system"}
            </span>,
            <code key="action" className="break-all text-xs font-semibold text-teal-800 dark:text-teal-100">
              {entry.action}
            </code>,
            <span key="entity" className="inline-flex flex-wrap items-center gap-1.5 text-xs">
              {entry.entityType}
              {entry.entityType === "pharmacy" && (
                <Link
                  href={`/platform/pharmacies/${entry.entityId}`}
                  className="font-semibold text-teal-700 underline-offset-4 hover:underline dark:text-teal-200"
                >
                  View
                </Link>
              )}
            </span>,
            <code
              key="details"
              className="block max-w-full break-all text-[11px] leading-5 text-[#697871] dark:text-teal-100/55 md:max-w-[22rem] md:truncate"
              title={details}
            >
              {details}
            </code>,
          ];
        })}
      />

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/platform/audit"
        queryParams={{ q: q || undefined, action: actionFilter || undefined }}
        variant="platform"
      />
    </PlatformPage>
  );
}
