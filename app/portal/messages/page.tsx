import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { Panel, EmptyState } from "@/app/components/portal/PortalWidgets";
import {
  MessageSquare,
  Bell,
  Inbox,
  CheckCheck,
  Clock,
  Mail,
  Phone,
  MessageCircle,
  Megaphone,
  Pill,
  CalendarClock,
  Sparkles,
} from "lucide-react";

export const metadata = { title: "Messages" };

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
};

export default async function PortalMessagesPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");

  const [conversations, notifications] = await Promise.all([
    prisma.conversation.findMany({
      where: { customerId: user.customerId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { lastMessageAt: "desc" },
    }),
    prisma.notification.findMany({
      where: { customerId: user.customerId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <PortalShell
      user={user}
      title="Messages & notifications"
      subtitle="Conversations with your pharmacy team and recent activity."
    >
      <div className="grid gap-6 lg:grid-cols-2">
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
            <div className="space-y-4">
              {conversations.map((c) => {
                const ChannelIcon = channelIcon[c.channel] || MessageSquare;
                return (
                  <div
                    key={c.id}
                    className="rounded-xl border border-[#e3ebe6] bg-white p-4 transition hover:border-[#0d6e5a]/30"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e6f4ef] text-[#0d6e5a]">
                          <ChannelIcon className="h-4 w-4" />
                        </span>
                        <p className="truncate text-sm font-semibold text-[#0c1a14]">
                          {c.subject || c.channel}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
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
                    <ul className="space-y-2">
                      {c.messages.map((m) => {
                        const outbound = m.direction === "outbound";
                        return (
                          <li
                            key={m.id}
                            className={`rounded-xl px-3 py-2 text-sm ${
                              outbound
                                ? "ml-8 bg-[#e6f4ef] text-[#084c3f]"
                                : "mr-8 bg-[#f4f7f4] text-[#0c1a14]"
                            }`}
                          >
                            <p className="mb-0.5 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-[#8a9a92]">
                              <span>{m.senderType}</span>
                              <span>{new Date(m.createdAt).toLocaleString()}</span>
                            </p>
                            <p className="whitespace-pre-wrap">{m.body}</p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Notification feed */}
        <Panel
          title="Notification feed"
          description="All activity on your account, newest first"
        >
          {notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications"
              description="Refill updates, reminders and messages will land here."
            />
          ) : (
            <ul className="space-y-2.5">
              {notifications.map((n) => {
                const TypeIcon = typeIcon[n.type] || Bell;
                const ChannelIcon = channelIcon[n.channel] || Bell;
                return (
                  <li
                    key={n.id}
                    className="flex items-start gap-3 rounded-xl border border-[#e3ebe6] bg-[#fafbfa] px-3.5 py-3 transition hover:border-[#0d6e5a]/30"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e6f4ef] text-[#0d6e5a]">
                      <TypeIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[#0c1a14]">{n.title}</p>
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#8a9a92]">
                          <ChannelIcon className="h-2.5 w-2.5" />
                          {n.channel}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-[#5a6b62]">{n.body}</p>
                      <p className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-[#8a9a92]">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(n.createdAt).toLocaleString()}
                        {n.status === "delivered" && (
                          <span className="ml-1 inline-flex items-center gap-0.5 text-emerald-600">
                            <CheckCheck className="h-2.5 w-2.5" /> delivered
                          </span>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </PortalShell>
  );
}
