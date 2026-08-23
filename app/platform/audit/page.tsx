import Link from "next/link";
import { prismaUnscoped } from "@/app/lib/db";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";

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
    ...(actionFilter ? { action: { contains: actionFilter, mode: "insensitive" as const } } : {}),
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
      include: {
        actor: { select: { email: true } },
      },
    })
    .catch(() => []);

  return (
    <div>
      <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>
        Audit log
      </h1>
      <p className="mt-2 text-sm text-teal-100/70">
        Every privileged action across the network — verification decisions, tenant edits,
        impersonations, user administration.
      </p>

      <form method="GET" className="mt-6 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search action, entity, or actor email…"
          aria-label="Search audit log"
          className="h-11 flex-1 rounded-xl border border-white/15 bg-black/30 px-4 text-sm outline-none placeholder:text-teal-100/40 focus:border-teal-300/40"
        />
        <input
          type="search"
          name="action"
          defaultValue={actionFilter}
          placeholder="Action prefix (e.g. pharmacy.)"
          aria-label="Filter by action prefix"
          className="h-11 rounded-xl border border-white/15 bg-black/30 px-4 text-sm outline-none placeholder:text-teal-100/40 focus:border-teal-300/40 sm:w-64"
        />
        <button type="submit" className="h-11 rounded-xl bg-white/10 px-5 text-sm font-semibold hover:bg-white/15">
          Filter
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-teal-100/60">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-teal-100/50">
                  No audit entries match.
                </td>
              </tr>
            )}
            {rows.map((e) => {
              const details = e.details && typeof e.details === "object" ? JSON.stringify(e.details) : "";
              return (
                <tr key={e.id} className="align-top hover:bg-white/5">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-teal-100/70">
                    {new Date(e.createdAt).toLocaleString("en-KE")}
                  </td>
                  <td className="px-4 py-3 text-xs">{e.actor?.email || "system"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{e.action}</td>
                  <td className="px-4 py-3 text-xs text-teal-100/70">
                    {e.entityType}
                    {e.entityType === "pharmacy" && (
                      <Link href={`/platform/pharmacies/${e.entityId}`} className="ml-1 underline hover:text-white">
                        view
                      </Link>
                    )}
                  </td>
                  <td className="max-w-[280px] truncate px-4 py-3 font-mono text-[11px] text-teal-100/50" title={details}>
                    {details}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/platform/audit"
        queryParams={{ q: q || undefined, action: actionFilter || undefined }}
      />
    </div>
  );
}
