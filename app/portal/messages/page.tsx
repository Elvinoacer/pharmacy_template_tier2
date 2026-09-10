import { redirect } from "next/navigation";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { Panel, EmptyState } from "@/app/components/portal/PortalWidgets";
import { PortalNotificationsPanel, type NotifRow } from "@/app/components/portal/PortalNotificationsPanel";
import { PortalReplyForm } from "@/app/components/portal/PortalReplyForm";
import { parsePageParam } from "@/app/lib/pagination";
import { formatDateTime } from "@/app/lib/time";
import {
  MessageSquare,
  Bell,
  Inbox,
  Mail,
  Phone,
  MessageCircle,
  Megaphone,
  Pill,
  CalendarClock,
  Sparkles,
  HeartPulse,
} from "lucide-react";

export const metadata = { title: "Messages" };

const PAGE_SIZE = 20;

const channelIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageCircle,
  portal: MessageSquare,
  in_app: Bell,
  push: Bell,
};

const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  refill: Pill,
  message: MessageSquare,
  reminder: CalendarClock,
  campaign: Megaphone,
  loyalty: Sparkles,
  symptom_staff_reply: HeartPulse,
};

export default async function PortalMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;

  const where = {
    customerId: user.customerId,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { body: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rawNotifications, conversations] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.conversation.findMany({
      where: { customerId: user.customerId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { lastMessageAt: "desc" },
    }),
  ]);

  const page = parsePageParam(sp.page, total, PAGE_SIZE);
  const paged = page === 1
    ? rawNotifications
    : await prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      });

  const notifications: NotifRow[] = paged.map((n) => ({
    id: n.id,
    channel: n.channel,
    type: n.type,
    title: n.title,
    body: n.body,
    fullBody: n.fullBody,
    status: n.status,
    openedAt: n.openedAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <PortalShell
      user={user}
      title="Messages & notifications"
      subtitle="Conversations with your pharmacy team and recent activity."
    >
      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Conversations */}
        <Panel
          title="Conversations"
          description={`${conversations.length} thread${conversations.length === 1 ? "" : "s"}`}
        >
          {conversations.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No conversations yet"
              description="When a pharmacist messages you, the thread will appear here."
            />
          ) : (
            <div className="min-w-0 space-y-3 sm:space-y-4">
              {conversations.map((c) => {
                const ChannelIcon = channelIcon[c.channel] || MessageSquare;
                return (
                  <div
                    key={c.id}
                    className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 transition hover:border-[#0d6e5a]/30 sm:p-4"
                  >
                    <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-deep)]">
                          <ChannelIcon className="h-4 w-4" />
                        </span>
                        <p className="min-w-0 break-words text-sm font-semibold text-[var(--foreground)]">
                          {c.subject || c.channel}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          c.status === "open"
                            ? "bg-emerald-100 text-emerald-700"
                            : c.status === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : c.status === "resolved"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <ul className="min-w-0 space-y-2">
                      {c.messages.map((m) => {
                        const outbound = m.direction === "outbound";
                        return (
                          <li
                            key={m.id}
                            className={`min-w-0 rounded-xl px-3 py-2 text-sm ${
                              outbound
                                ? "bg-[var(--brand-soft)] text-[var(--brand-deep)] sm:ml-8"
                                : "bg-[var(--card-elev)] text-[var(--foreground)] sm:mr-8"
                            }`}
                          >
                            <p className="mb-1 flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[10px] uppercase tracking-wide text-[var(--muted-2)]">
                              <span>{m.senderType}</span>
                              <span className="normal-case tracking-normal">{formatDateTime(m.createdAt)}</span>
                            </p>
                            <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                          </li>
                        );
                      })}
                    </ul>
                    {c.status !== "closed" && (
                      <PortalReplyForm conversationId={c.id} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Notification feed with full features */}
        <Panel
          title="Notification feed"
          description={`${total} total · searchable, paginated`}
        >
          <PortalNotificationsPanel
            initial={notifications}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            basePath="/portal/messages"
            queryParams={{ q }}
          />
        </Panel>
      </div>
    </PortalShell>
  );
}
