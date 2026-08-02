import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateCampaignAction, adminLaunchCampaignAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import CampaignForm from "@/app/components/admin/CampaignForm";
import { Megaphone, Rocket, Mail, MessageSquare, MessageCircle, Zap, Calendar, Users } from "lucide-react";

export const metadata = { title: "Campaigns" };

const CHANNEL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageCircle,
  multi: Zap,
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-600",
  scheduled: "bg-amber-500/15 text-amber-700",
  sending: "bg-blue-500/15 text-blue-700",
  sent: "bg-emerald-500/15 text-emerald-700",
  cancelled: "bg-rose-500/15 text-rose-600",
};

export default async function AdminCampaignsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [campaigns, segments] = await Promise.all([
    prisma.campaign.findMany({
      include: { segment: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.segment.findMany({ orderBy: { name: "asc" } }),
  ]);

  const stats = {
    total: campaigns.length,
    drafts: campaigns.filter((c) => c.status === "draft").length,
    scheduled: campaigns.filter((c) => c.status === "scheduled").length,
    sent: campaigns.filter((c) => c.status === "sent").length,
  };

  return (
    <AdminShell
      user={user}
      title="Campaign management"
      subtitle="Design, schedule and launch targeted marketing campaigns"
    >
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: stats.total, color: "admin-text" },
          { label: "Drafts", value: stats.drafts, color: "text-slate-600" },
          { label: "Scheduled", value: stats.scheduled, color: "text-amber-700" },
          { label: "Sent", value: stats.sent, color: "text-emerald-700" },
        ].map((s) => (
          <div key={s.label} className="admin-stat p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Create campaign" description="Set up a new marketing campaign">
          <CampaignForm
            action={adminCreateCampaignAction}
            segments={segments.map((s) => ({ id: s.id, name: s.name }))}
          />
        </AdminPanel>

        <AdminPanel
          title="All campaigns"
          description={`${campaigns.length} created`}
        >
          {campaigns.length === 0 ? (
            <AdminEmptyState
              icon={Megaphone}
              title="No campaigns yet"
              description="Create your first campaign to start engaging customers."
            />
          ) : (
            <ul className="space-y-3">
              {campaigns.map((c) => {
                const ChannelIcon = CHANNEL_ICON[c.channel] || Mail;
                const canLaunch = (c.status === "draft" || c.status === "scheduled") && user.role === "manager";
                const stats = c.stats as { sent?: number; delivered?: number; failed?: number; opened?: number; clicked?: number } | null;
                return (
                  <li
                    key={c.id}
                    className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 transition hover:border-[var(--admin-border-2)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--admin-accent-soft)] admin-accent-text">
                            <ChannelIcon className="h-3.5 w-3.5" />
                          </span>
                          <p className="font-semibold admin-text">{c.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLOR[c.status]}`}>
                            {c.status}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] admin-muted">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-2.5 w-2.5" />
                            {c.segment?.name || "All customers"}
                          </span>
                          <span>·</span>
                          <span className="capitalize">{c.channel}</span>
                          {c.scheduledFor && (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-2.5 w-2.5" />
                                {new Date(c.scheduledFor).toLocaleString()}
                              </span>
                            </>
                          )}
                        </div>
                        {c.description && (
                          <p className="mt-1 text-xs admin-muted">{c.description}</p>
                        )}
                        <p className="mt-1.5 line-clamp-2 text-xs admin-muted">{c.body}</p>
                        {stats && (
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                            {typeof stats.sent === "number" && (
                              <span className="rounded bg-[var(--admin-inset)] px-1.5 py-0.5 admin-muted">Sent: {stats.sent}</span>
                            )}
                            {typeof stats.delivered === "number" && (
                              <span className="rounded bg-[var(--admin-inset)] px-1.5 py-0.5 admin-muted">Delivered: {stats.delivered}</span>
                            )}
                            {typeof stats.opened === "number" && (
                              <span className="rounded bg-[var(--admin-inset)] px-1.5 py-0.5 admin-muted">Opened: {stats.opened}</span>
                            )}
                            {typeof stats.clicked === "number" && (
                              <span className="rounded bg-[var(--admin-inset)] px-1.5 py-0.5 admin-muted">Clicked: {stats.clicked}</span>
                            )}
                          </div>
                        )}
                      </div>
                      {canLaunch && (
                        <form action={adminLaunchCampaignAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <button
                            type="submit"
                            className="btn-admin-sm"
                          >
                            <Rocket className="h-3 w-3" /> Launch
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
