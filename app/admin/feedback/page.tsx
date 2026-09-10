import { formatDateTime } from "@/app/lib/time";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminFeedbackRespondAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import FeedbackRespondForm from "@/app/components/admin/FeedbackRespondForm";
import {
  Star,
  Lightbulb,
  AlertTriangle,
  Smile,
  MessageSquare,
  Clock,
  CheckCircle2,
  Inbox,
} from "lucide-react";

export const metadata = { title: "Feedback" };

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  review: Star,
  suggestion: Lightbulb,
  complaint: AlertTriangle,
  satisfaction: Smile,
};

const STATUS_COLOR: Record<string, string> = {
  new: "bg-rose-500/12 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20",
  reviewed:
    "bg-amber-500/12 text-amber-800 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
  responded:
    "bg-emerald-500/12 text-emerald-800 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  archived:
    "bg-slate-500/10 text-slate-600 ring-1 ring-inset ring-slate-500/15 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20",
};

export default async function AdminFeedbackPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const items = await prisma.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 50 });

  const rated = items.filter((f) => f.rating);
  const stats = {
    total: items.length,
    new: items.filter((f) => f.status === "new").length,
    responded: items.filter((f) => f.status === "responded").length,
    avgRating: rated.length
      ? (rated.reduce((sum, f) => sum + (f.rating || 0), 0) / rated.length).toFixed(1)
      : "—",
  };

  return (
    <AdminShell
      user={user}
      title="Patient feedback"
      subtitle="Review what customers are saying, prioritise unresolved feedback, and respond without losing context."
    >
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:mb-6 sm:gap-3 lg:grid-cols-4">
        <div className="admin-stat p-3.5 sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] admin-muted sm:text-xs">Total</p>
          <p className="mt-1 text-xl font-bold admin-text sm:text-2xl">{stats.total}</p>
        </div>
        <div className="admin-stat p-3.5 sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-rose-700 dark:text-rose-300 sm:text-xs">New</p>
          <p className="mt-1 text-xl font-bold text-rose-700 dark:text-rose-300 sm:text-2xl">{stats.new}</p>
        </div>
        <div className="admin-stat p-3.5 sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300 sm:text-xs">Responded</p>
          <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-300 sm:text-2xl">{stats.responded}</p>
        </div>
        <div className="admin-stat p-3.5 sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800 dark:text-amber-300 sm:text-xs">Avg rating</p>
          <p className="mt-1 text-xl font-bold text-amber-800 dark:text-amber-300 sm:text-2xl">{stats.avgRating}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <AdminPanel>
          <AdminEmptyState
            icon={Inbox}
            title="No feedback yet"
            description="Customer feedback from the portal will appear here as soon as someone submits it."
          />
        </AdminPanel>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {items.map((f) => {
            const Icon = TYPE_ICON[f.type] || MessageSquare;
            const subject = f.title || f.name || "Anonymous feedback";
            return (
              <AdminPanel key={f.id} className="transition-[border-color,box-shadow] duration-200 hover:border-[var(--admin-border-2)] hover:shadow-sm">
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-accent-soft)] admin-accent-text sm:h-10 sm:w-10">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold leading-5 admin-text sm:text-base">{subject}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_COLOR[f.status] || STATUS_COLOR.archived}`}>
                            {f.status}
                          </span>
                          <span className="rounded-full bg-[var(--admin-inset)] px-2.5 py-1 text-[11px] font-semibold capitalize admin-muted ring-1 ring-inset ring-[var(--admin-border)]">
                            {f.type}
                          </span>
                        </div>
                      </div>

                      {f.rating ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 self-start rounded-full bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < f.rating!
                                  ? "fill-amber-400 text-amber-500 dark:fill-amber-300 dark:text-amber-300"
                                  : "text-slate-300 dark:text-slate-600"
                              }`}
                            />
                          ))}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 admin-text">{f.body}</p>

                    <div className="mt-2 flex flex-col gap-1 text-[11px] admin-soft sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(f.createdAt)}
                      </span>
                      {f.email && (
                        <span className="break-all normal-case admin-muted sm:break-normal">{f.email}</span>
                      )}
                    </div>

                    {f.staffResponse && (
                      <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2.5 dark:border-emerald-400/20 dark:bg-emerald-400/[0.07] sm:px-4 sm:py-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">Staff response</p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 admin-text">{f.staffResponse}</p>
                        </div>
                      </div>
                    )}

                    {f.status !== "responded" && (
                      <div className="mt-4 border-t border-[var(--admin-border)] pt-4">
                        <FeedbackRespondForm
                          action={adminFeedbackRespondAction}
                          id={f.id}
                          isPublic={f.isPublic}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </AdminPanel>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
