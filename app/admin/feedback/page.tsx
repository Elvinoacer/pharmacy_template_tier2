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
} from "lucide-react";

export const metadata = { title: "Feedback" };

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  review: Star,
  suggestion: Lightbulb,
  complaint: AlertTriangle,
  satisfaction: Smile,
};

const STATUS_COLOR: Record<string, string> = {
  new: "bg-rose-500/15 text-rose-600",
  reviewed: "bg-amber-500/15 text-amber-700",
  responded: "bg-emerald-500/15 text-emerald-700",
  archived: "bg-slate-500/15 text-slate-600",
};

export default async function AdminFeedbackPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const items = await prisma.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 50 });

  const stats = {
    total: items.length,
    new: items.filter((f) => f.status === "new").length,
    responded: items.filter((f) => f.status === "responded").length,
    avgRating: items.filter((f) => f.rating).length
      ? (items.filter((f) => f.rating).reduce((s, f) => s + (f.rating || 0), 0) / items.filter((f) => f.rating).length).toFixed(1)
      : "—",
  };

  return (
    <AdminShell
      user={user}
      title="Customer feedback"
      subtitle={`${items.length} feedback ${items.length === 1 ? "entry" : "entries"} from customers`}
    >
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="admin-stat p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Total</p>
          <p className="mt-1 text-2xl font-bold admin-text">{stats.total}</p>
        </div>
        <div className="admin-stat p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">New</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{stats.new}</p>
        </div>
        <div className="admin-stat p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Responded</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.responded}</p>
        </div>
        <div className="admin-stat p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Avg rating</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{stats.avgRating}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <AdminPanel>
          <AdminEmptyState
            icon={MessageSquare}
            title="No feedback yet"
            description="Customer feedback from the portal will land here."
          />
        </AdminPanel>
      ) : (
        <div className="space-y-4">
          {items.map((f) => {
            const Icon = TYPE_ICON[f.type] || MessageSquare;
            return (
              <AdminPanel key={f.id}>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-accent-soft)] admin-accent-text">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold admin-text">{f.title || f.name || "Anonymous"}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLOR[f.status]}`}>
                        {f.status}
                      </span>
                      <span className="rounded-full bg-[var(--admin-inset)] px-2 py-0.5 text-[10px] capitalize admin-muted">
                        {f.type}
                      </span>
                      {f.rating ? (
                        <span className="inline-flex items-center gap-0.5 text-amber-700">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${i < f.rating! ? "fill-amber-400 text-amber-500" : "text-slate-500"}`}
                            />
                          ))}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm admin-text">{f.body}</p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-wide admin-soft">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(f.createdAt).toLocaleString()}
                      {f.email && <span className="ml-2 normal-case admin-muted">· {f.email}</span>}
                    </p>

                    {f.staffResponse && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            Staff response
                          </p>
                          <p className="mt-0.5 admin-text">{f.staffResponse}</p>
                        </div>
                      </div>
                    )}

                    {f.status !== "responded" && (
                      <div className="mt-3 border-t border-[var(--admin-border)] pt-3">
                        <FeedbackRespondForm action={adminFeedbackRespondAction} id={f.id} />
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
