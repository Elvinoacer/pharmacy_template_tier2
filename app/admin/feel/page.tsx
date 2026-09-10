import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { formatDateTime } from "@/app/lib/time";
import {
  Activity,
  AlertCircle,
  ChevronRight,
  HeartPulse,
  MessageSquare,
  Sparkles,
  User,
} from "lucide-react";

export const metadata = { title: "How do you feel inbox" };

const STATUS_STYLE: Record<string, string> = {
  active:
    "bg-teal-500/12 text-teal-800 ring-1 ring-inset ring-teal-500/20 dark:bg-teal-400/10 dark:text-teal-300 dark:ring-teal-400/20",
  monitoring:
    "bg-blue-500/12 text-blue-800 ring-1 ring-inset ring-blue-500/20 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/20",
  escalated:
    "bg-amber-500/12 text-amber-900 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
  resolved:
    "bg-emerald-500/12 text-emerald-800 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  closed:
    "bg-slate-500/10 text-slate-600 ring-1 ring-inset ring-slate-500/15 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20",
};

export default async function AdminFeelInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const statusFilter = sp.status?.trim() || undefined;

  const where = statusFilter ? { status: statusFilter as never } : {};

  const [sessions, counts, escalatedCount, worseCount] = await Promise.all([
    prisma.symptomSession.findMany({
      where,
      include: {
        customer: { select: { fullName: true, phone: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: [{ status: "asc" }, { lastMessageAt: "desc" }],
      take: 80,
    }),
    prisma.symptomSession.groupBy({ by: ["status"], _count: true }),
    prisma.symptomSession.count({ where: { status: "escalated" } }),
    prisma.symptomSession.count({
      where: {
        feelingTrend: "worse",
        status: { in: ["active", "monitoring", "escalated"] },
      },
    }),
  ]);

  const sorted = [...sessions].sort((a, b) => {
    const rank = (s: (typeof sessions)[number]) => {
      if (s.feelingTrend === "worse" && s.status !== "resolved" && s.status !== "closed") return 0;
      if (s.status === "escalated") return 1;
      if (s.status === "active" || s.status === "monitoring") return 2;
      return 3;
    };
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0);
  });

  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <AdminShell
      user={user}
      title="Symptom check-ins"
      subtitle="Triage worsening and escalated cases first, then work through active monitoring sessions."
    >
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:mb-6 sm:gap-3 lg:grid-cols-4">
        <div className="admin-stat border-rose-500/25 bg-rose-500/[0.04] p-3.5 dark:border-rose-400/20 dark:bg-rose-400/[0.04] sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-rose-700 dark:text-rose-300 sm:text-xs">
              Feeling worse
            </p>
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-300" />
          </div>
          <p className="mt-1 text-xl font-bold text-rose-700 dark:text-rose-300 sm:text-2xl">{worseCount}</p>
          <p className="mt-1 text-[11px] leading-4 admin-soft">Review these first</p>
        </div>
        <div className="admin-stat p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800 dark:text-amber-300 sm:text-xs">
              Needs pharmacist
            </p>
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          </div>
          <p className="mt-1 text-xl font-bold text-amber-800 dark:text-amber-300 sm:text-2xl">{escalatedCount}</p>
          <p className="mt-1 text-[11px] leading-4 admin-soft">Escalated cases</p>
        </div>
        {(["active", "monitoring"] as const).map((s) => (
          <div key={s} className="admin-stat p-3.5 sm:p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] admin-muted sm:text-xs">{s}</p>
            <p className="mt-1 text-xl font-bold admin-text sm:text-2xl">{byStatus[s] || 0}</p>
            <p className="mt-1 text-[11px] leading-4 admin-soft">Open follow-up</p>
          </div>
        ))}
      </div>

      <div className="-mx-1 mb-4 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        <div className="flex min-w-max items-center gap-2">
          <Link
            href="/admin/feel"
            className={`min-h-10 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
              !statusFilter ? "bg-teal-700 text-white shadow-sm dark:bg-teal-500 dark:text-slate-950" : "admin-chip"
            }`}
          >
            All
          </Link>
          {(["escalated", "active", "monitoring", "resolved", "closed"] as const).map((s) => (
            <Link
              key={s}
              href={`/admin/feel?status=${s}`}
              className={`min-h-10 rounded-full px-3.5 py-2 text-xs font-semibold capitalize transition ${
                statusFilter === s
                  ? "bg-teal-700 text-white shadow-sm dark:bg-teal-500 dark:text-slate-950"
                  : "admin-chip"
              }`}
            >
              {s} ({byStatus[s] || 0})
            </Link>
          ))}
        </div>
      </div>

      <AdminPanel
        title="Triage queue"
        description="Sorted by clinical attention: worsening first, then escalated, then active monitoring. Open a case for the full transcript, images, and staff reply."
      >
        {sorted.length === 0 ? (
          <AdminEmptyState
            icon={HeartPulse}
            title="No check-ins in this view"
            description="New How do you feel sessions will appear here with their latest symptoms and AI summary."
          />
        ) : (
          <ul className="-mx-1 divide-y admin-border sm:mx-0">
            {sorted.map((s) => {
              const last = s.messages[0];
              const isWorse =
                s.feelingTrend === "worse" &&
                s.status !== "resolved" &&
                s.status !== "closed";

              return (
                <li key={s.id} className="py-1.5 first:pt-0 last:pb-0 sm:py-0">
                  <Link
                    href={`/admin/feel/${s.id}`}
                    className={`group flex min-w-0 flex-col gap-3 rounded-xl px-2.5 py-3.5 transition-[background-color,border-color,box-shadow] hover:bg-[var(--admin-inset)] sm:flex-row sm:items-center sm:justify-between sm:rounded-none sm:px-1 sm:py-4 ${
                      isWorse
                        ? "border border-rose-500/20 bg-rose-500/[0.05] shadow-sm dark:border-rose-400/20 dark:bg-rose-400/[0.04] sm:my-1 sm:rounded-xl sm:px-3"
                        : "border border-transparent"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] sm:text-[11px] ${
                            STATUS_STYLE[s.status] || STATUS_STYLE.active
                          }`}
                        >
                          {s.status}
                        </span>
                        {isWorse && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20 sm:text-[11px]">
                            <AlertCircle className="h-3 w-3" />
                            feeling worse
                          </span>
                        )}
                        {s.severity && (
                          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] admin-muted sm:text-[11px]">
                            {s.severity}
                          </span>
                        )}
                        {s.feelingTrend && !isWorse && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold admin-muted sm:text-[11px]">
                            <Activity className="h-3 w-3" />
                            felt {s.feelingTrend}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 admin-text sm:truncate sm:text-[15px]">
                        {s.provisionalLabel || s.chiefComplaint || s.category || "Symptom check-in"}
                      </p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] admin-muted sm:text-xs">
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="max-w-40 truncate sm:max-w-none">{s.customer?.fullName || "Guest"}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{s.messageCount} messages</span>
                        {s.lastMessageAt && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{formatDateTime(s.lastMessageAt)}</span>
                          </>
                        )}
                      </div>

                      {s.aiSummary && (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 admin-soft">
                          <Sparkles className="mr-1 inline h-3 w-3 admin-accent-text" />
                          {s.aiSummary}
                        </p>
                      )}

                      {last && (
                        <p className="mt-1.5 flex min-w-0 items-start gap-1.5 text-xs admin-muted">
                          <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
                          <span className="line-clamp-1 min-w-0">
                            {last.role}: {last.content}
                          </span>
                        </p>
                      )}
                    </div>

                    <span className="inline-flex min-h-10 shrink-0 items-center justify-between gap-2 self-stretch rounded-lg bg-[var(--admin-inset)] px-3 text-xs font-semibold admin-accent-text sm:min-h-0 sm:self-auto sm:bg-transparent sm:px-0">
                      Open case
                      <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
