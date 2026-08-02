import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateCampaignAction, adminLaunchCampaignAction } from "@/app/actions/admin";
import {
  AdminShell,
  AdminPanel,
  AdminEmptyState,
} from "@/app/components/admin/AdminShell";
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
  draft: "bg-slate-500/15 text-slate-300",
  scheduled: "bg-amber-500/15 text-amber-300",
  sending: "bg-blue-500/15 text-blue-300",
  sent: "bg-emerald-500/15 text-emerald-300",
  cancelled: "bg-rose-500/15 text-rose-300",
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
          { label: "Total", value: stats.total, color: "text-white" },
          { label: "Drafts", value: stats.drafts, color: "text-slate-300" },
          { label: "Scheduled", value: stats.scheduled, color: "text-amber-300" },
          { label: "Sent", value: stats.sent, color: "text-emerald-300" },
        ].map((s) => (
          <div key={s.label} className="admin-stat p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#ecfdf5]/55">{s.label}</p>
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
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-white/[0.12]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2dd4bf]/15 text-[#2dd4bf]">
                            <ChannelIcon className="h-3.5 w-3.5" />
                          </span>
                          <p className="font-semibold text-white">{c.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLOR[c.status]}`}>
                            {c.status}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-[#ecfdf5]/55">
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
                          <p className="mt-1 text-xs text-[#ecfdf5]/65">{c.description}</p>
                        )}
                        <p className="mt-1.5 line-clamp-2 text-xs text-[#ecfdf5]/55">{c.body}</p>
                        {stats && (
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                            {typeof stats.sent === "number" && (
                              <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[#ecfdf5]/70">Sent: {stats.sent}</span>
                            )}
                            {typeof stats.delivered === "number" && (
                              <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[#ecfdf5]/70">Delivered: {stats.delivered}</span>
                            )}
                            {typeof stats.opened === "number" && (
                              <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[#ecfdf5]/70">Opened: {stats.opened}</span>
                            )}
                            {typeof stats.clicked === "number" && (
                              <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[#ecfdf5]/70">Clicked: {stats.clicked}</span>
                            )}
                          </div>
                        )}
                      </div>
                      {canLaunch && (
                        <form action={adminLaunchCampaignAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <button
                            type="submit"
                            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#0f766e] px-3 py-1.5 text-xs font-semibold text-[#042f2e] transition hover:brightness-110"
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
