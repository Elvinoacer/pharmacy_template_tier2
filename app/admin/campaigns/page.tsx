import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateCampaignAction, adminLaunchCampaignAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { PremiumFeatureNotice } from "@/app/components/admin/PremiumFeatureNotice";
import { PremiumGate } from "@/app/components/admin/PremiumGate";
import CampaignForm from "@/app/components/admin/CampaignForm";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";
import { Megaphone, Rocket, Mail, MessageSquare, MessageCircle, Zap, Calendar, Users, Search, X } from "lucide-react";
import { formatDateTime } from "@/app/lib/time";
import type { Prisma } from "@/app/generated/prisma/client";
import { hasPremiumPlan } from "@/app/lib/platform/entitlements";
import { FREE_MONTHLY_CAMPAIGN_LAUNCH_LIMIT } from "@/app/lib/platform/plan-policy";

export const metadata = { title: "Campaigns" };

const PAGE_SIZE = 25;

const CHANNEL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageCircle,
  multi: Zap,
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  scheduled: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  sending: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  sent: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const pharmacyId =
    user.activePharmacyId ||
    user.memberships.find((membership) => membership.status === "active")?.pharmacyId;
  if (!pharmacyId) redirect("/admin/select");

  const premiumActive = await hasPremiumPlan(pharmacyId);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const where: Prisma.CampaignWhereInput = sp.q
    ? {
        OR: [
          { name: { contains: sp.q, mode: "insensitive" } },
          { body: { contains: sp.q, mode: "insensitive" } },
          { description: { contains: sp.q, mode: "insensitive" } },
          { subject: { contains: sp.q, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, statusGroups, segments, monthlyLaunches] = await Promise.all([
    prisma.campaign.count({ where }),
    prisma.campaign.groupBy({ by: ["status"], _count: true }),
    prisma.segment.findMany({ orderBy: { name: "asc" } }),
    premiumActive
      ? Promise.resolve(0)
      : prisma.campaign.count({
          where: {
            OR: [
              { sentAt: { gte: monthStart, lt: nextMonth } },
              { status: "sending", updatedAt: { gte: monthStart, lt: nextMonth } },
            ],
          },
        }),
  ]);

  const page = parsePageParam(sp.page, total, PAGE_SIZE);
  const campaigns = await prisma.campaign.findMany({
    where,
    include: { segment: true },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const stats = {
    total: statusGroups.reduce((s, g) => s + g._count, 0),
    drafts: statusGroups.find((g) => g.status === "draft")?._count ?? 0,
    scheduled: statusGroups.find((g) => g.status === "scheduled")?._count ?? 0,
    sent: statusGroups.find((g) => g.status === "sent")?._count ?? 0,
  };

  const queryParams: Record<string, string | undefined> = { q: sp.q };
  const freeLaunchesRemaining = premiumActive
    ? null
    : Math.max(0, FREE_MONTHLY_CAMPAIGN_LAUNCH_LIMIT - monthlyLaunches);

  return (
    <AdminShell
      user={user}
      title="Campaigns"
      subtitle="Create outreach campaigns and review their audience, schedule, and progress."
    >
      {!premiumActive && (
        <div className="mb-5">
          <PremiumFeatureNotice
            title="Bring customers back automatically"
            description={`Free includes ${FREE_MONTHLY_CAMPAIGN_LAUNCH_LIMIT} campaign launch per month and unlimited drafts. Premium removes the launch cap and unlocks scheduling, custom patient groups and multi-channel outreach.`}
            benefits={["Unlimited launches", "Scheduled campaigns", "Custom audiences", "Multi-channel delivery"]}
          />
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: stats.total, color: "admin-text" },
          { label: "Drafts", value: stats.drafts, color: "text-slate-700 dark:text-slate-300" },
          { label: "Scheduled", value: stats.scheduled, color: "text-amber-800 dark:text-amber-300" },
          { label: "Sent", value: stats.sent, color: "text-emerald-700 dark:text-emerald-300" },
        ].map((s) => (
          <div key={s.label} className="admin-stat min-h-24 p-4 transition-[border-color,box-shadow] duration-200 hover:shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] admin-muted">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(320px,0.86fr)_minmax(0,1.14fr)]">
        <AdminPanel
          title="All campaigns"
          description={`${total} matching`}
          className="order-1 lg:order-2"
        >
          <form className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input
                name="q"
                defaultValue={sp.q || ""}
                placeholder="Search campaigns…"
                className="min-h-11 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] py-2 pl-9 pr-3 text-base admin-text placeholder:admin-soft transition focus:border-[var(--admin-accent)] focus:bg-[var(--admin-card)] focus:outline-none sm:text-sm"
              />
            </div>
            <button type="submit" className="btn-admin-sm min-h-11 w-full justify-center text-sm sm:w-auto">
              <Search className="h-3.5 w-3.5" /> Search
            </button>
            {sp.q && (
              <Link href="/admin/campaigns" className="btn-admin-sm min-h-11 w-full justify-center !bg-[var(--admin-inset-2)] text-sm sm:w-auto">
                <X className="h-3.5 w-3.5" /> Clear
              </Link>
            )}
          </form>

          {campaigns.length === 0 ? (
            <AdminEmptyState
              icon={Megaphone}
              title="No campaigns yet"
              description={sp.q ? "Try a different search term." : "Create your first campaign to start engaging customers."}
            />
          ) : (
            <ul className="space-y-3">
              {campaigns.map((c) => {
                const ChannelIcon = CHANNEL_ICON[c.channel] || Mail;
                const canLaunch = (c.status === "draft" || c.status === "scheduled") && user.role === "manager";
                const requiresPremium =
                  !premiumActive &&
                  (Boolean(c.scheduledFor) ||
                    c.channel === "multi" ||
                    Boolean(c.segment && !c.segment.isSystem));
                const launchBlocked =
                  requiresPremium ||
                  (!premiumActive && freeLaunchesRemaining === 0);
                const cStats = c.stats as { sent?: number; delivered?: number; failed?: number; opened?: number; clicked?: number } | null;
                return (
                  <li
                    key={c.id}
                    className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 transition-[border-color,box-shadow,background-color] duration-200 hover:border-[var(--admin-border-2)] hover:bg-[var(--admin-card)] hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-accent-soft)] admin-accent-text">
                            <ChannelIcon className="h-4 w-4" />
                          </span>
                          <p className="min-w-0 flex-1 break-words font-semibold admin-text">{c.name}</p>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-sm font-semibold capitalize ${STATUS_COLOR[c.status]}`}>
                            {c.status}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm admin-muted">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {c.segment?.name || "All customers"}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{c.channel}</span>
                          {c.scheduledFor && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDateTime(c.scheduledFor)}
                              </span>
                            </>
                          )}
                        </div>
                        {c.description && (
                          <p className="mt-2 text-sm leading-5 admin-muted">{c.description}</p>
                        )}
                        <p className="mt-2 whitespace-pre-wrap break-words text-base leading-6 admin-text/80">{c.body}</p>
                        {cStats && (
                          <div className="mt-3 flex flex-wrap gap-2 text-sm">
                            {typeof cStats.sent === "number" && (
                              <span className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-card)] px-2 py-1 admin-muted">Sent {cStats.sent}</span>
                            )}
                            {typeof cStats.delivered === "number" && (
                              <span className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-card)] px-2 py-1 admin-muted">Delivered {cStats.delivered}</span>
                            )}
                            {typeof cStats.opened === "number" && (
                              <span className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-card)] px-2 py-1 admin-muted">Opened {cStats.opened}</span>
                            )}
                            {typeof cStats.clicked === "number" && (
                              <span className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-card)] px-2 py-1 admin-muted">Clicked {cStats.clicked}</span>
                            )}
                          </div>
                        )}
                      </div>
                      {canLaunch && (
                        launchBlocked ? (
                          <div className="shrink-0">
                            <PremiumGate
                              feature={requiresPremium ? "Premium campaign tools" : "Campaign launch allowance reached"}
                              description={
                                requiresPremium
                                  ? "This campaign uses Premium scheduling, targeting or multi-channel delivery. Your draft is preserved."
                                  : "Your Free monthly campaign launch is already used. Keep this campaign as a draft or reactivate Premium for unlimited launches."
                              }
                              label={requiresPremium ? "Unlock Premium" : "Unlock launches"}
                              usageKey="campaigns"
                            />
                          </div>
                        ) : (
                          <form action={adminLaunchCampaignAction} className="shrink-0">
                            <input type="hidden" name="id" value={c.id} />
                            <button
                              type="submit"
                              className="btn-admin-sm min-h-11 w-full justify-center text-sm sm:w-auto"
                            >
                              <Rocket className="h-3.5 w-3.5" /> Launch
                            </button>
                          </form>
                        )
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Pagination
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            basePath="/admin/campaigns"
            queryParams={queryParams}
            variant="admin"
          />
        </AdminPanel>

        <AdminPanel
          title="Create campaign"
          description="Build, target and schedule the next outreach"
          className="order-2 lg:order-1 lg:sticky lg:top-24"
        >
          <CampaignForm
            action={adminCreateCampaignAction}
            segments={segments.map((s) => ({ id: s.id, name: s.name, isSystem: s.isSystem }))}
            premiumActive={premiumActive}
            freeLaunchesRemaining={freeLaunchesRemaining}
          />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
