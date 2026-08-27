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
  HeartPulse,
  MessageSquare,
  Sparkles,
  User,
} from "lucide-react";

export const metadata = { title: "How do you feel inbox" };

const STATUS_STYLE: Record<string, string> = {
  active: "bg-teal-500/15 text-teal-800",
  monitoring: "bg-blue-500/15 text-blue-800",
  escalated: "bg-amber-500/15 text-amber-900",
  resolved: "bg-emerald-500/15 text-emerald-800",
  closed: "bg-slate-500/15 text-slate-600",
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

  // Prioritize: feeling worse first, then escalated, then open
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
      title="How do you feel"
      subtitle="Urgent symptom check-ins — separate from Contact enquiries. Feeling-worse alerts and pharmacist handoffs land here."
    >
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="admin-stat p-4 ring-1 ring-rose-500/30">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">
              Feeling worse
            </p>
            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <p className="mt-1 text-2xl font-bold text-rose-700">{worseCount}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">
              Needs pharmacist
            </p>
            <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-700">{escalatedCount}</p>
        </div>
        {(["active", "monitoring"] as const).map((s) => (
          <div key={s} className="admin-stat p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">{s}</p>
            <p className="mt-1 text-2xl font-bold admin-text">{byStatus[s] || 0}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/admin/feel"
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            !statusFilter ? "bg-teal-600 text-white" : "admin-chip"
          }`}
        >
          All
        </Link>
        {(["escalated", "active", "monitoring", "resolved", "closed"] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/feel?status=${s}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
              statusFilter === s ? "bg-teal-600 text-white" : "admin-chip"
            }`}
          >
            {s} ({byStatus[s] || 0})
          </Link>
        ))}
      </div>

      <AdminPanel
        title="Triage sessions"
        description="This queue is only for How do you feel — Contact page enquiries stay under Enquiries. Open a thread for the full transcript, images, and staff reply."
      >
        {sorted.length === 0 ? (
          <AdminEmptyState
            icon={HeartPulse}
            title="No check-ins yet"
            description="When visitors use How do you feel, sessions appear here with AI summaries."
          />
        ) : (
          <ul className="divide-y admin-border">
            {sorted.map((s) => {
              const last = s.messages[0];
              const isWorse =
                s.feelingTrend === "worse" &&
                s.status !== "resolved" &&
                s.status !== "closed";
              return (
                <li key={s.id}>
                  <Link
                    href={`/admin/feel/${s.id}`}
                    className={`flex flex-col gap-2 px-1 py-4 transition hover:bg-[var(--admin-inset)] sm:flex-row sm:items-center sm:justify-between ${
                      isWorse ? "rounded-xl bg-rose-500/5 ring-1 ring-rose-500/20" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            STATUS_STYLE[s.status] || STATUS_STYLE.active
                          }`}
                        >
                          {s.status}
                        </span>
                        {isWorse && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                            <AlertCircle className="h-3 w-3" />
                            feeling worse
                          </span>
                        )}
                        {s.severity && (
                          <span className="text-[10px] font-semibold uppercase admin-muted">
                            {s.severity}
                          </span>
                        )}
                        {s.feelingTrend && !isWorse && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold admin-muted">
                            <Activity className="h-3 w-3" />
                            felt {s.feelingTrend}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate font-semibold admin-text">
                        {s.provisionalLabel || s.chiefComplaint || s.category || "Symptom check-in"}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs admin-muted">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {s.customer?.fullName || "Guest"}
                        </span>
                        <span>·</span>
                        <span>{s.messageCount} messages</span>
                        {s.lastMessageAt && (
                          <>
                            <span>·</span>
                            <span>{formatDateTime(s.lastMessageAt)}</span>
                          </>
                        )}
                      </p>
                      {s.aiSummary && (
                        <p className="mt-1.5 line-clamp-2 text-xs admin-soft">
                          <Sparkles className="mr-1 inline h-3 w-3 admin-accent-text" />
                          {s.aiSummary}
                        </p>
                      )}
                      {last && (
                        <p className="mt-1 flex items-start gap-1 text-xs admin-muted">
                          <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
                          <span className="line-clamp-1">
                            {last.role}: {last.content}
                          </span>
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-semibold admin-accent-text">
                      Open →
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
