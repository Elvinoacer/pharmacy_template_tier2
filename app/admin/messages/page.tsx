import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import {
  AdminShell,
  AdminPanel,
  AdminEmptyState,
} from "@/app/components/admin/AdminShell";
import {
  MessageSquare,
  Mail,
  Phone,
  MessageCircle,
  Inbox,
  Clock,
  ArrowRight,
  User,
} from "lucide-react";

export const metadata = { title: "Communication center" };

const CHANNEL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageCircle,
  portal: MessageSquare,
  ai: MessageSquare,
};

const STATUS_COLOR: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-300",
  pending: "bg-amber-500/15 text-amber-300",
  resolved: "bg-blue-500/15 text-blue-300",
  closed: "bg-slate-500/15 text-slate-300",
};

export default async function AdminMessagesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const conversations = await prisma.conversation.findMany({
    include: {
      customer: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      assignedTo: { select: { email: true } },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  const byChannel = conversations.reduce<Record<string, number>>((acc, c) => {
    acc[c.channel] = (acc[c.channel] || 0) + 1;
    return acc;
  }, {});

  return (
    <AdminShell
      user={user}
      title="Communication center"
      subtitle="Centralized email, SMS, WhatsApp, and portal threads."
    >
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="admin-stat p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#ecfdf5]/55">Total threads</p>
          <p className="mt-1 text-2xl font-bold text-white">{conversations.length}</p>
        </div>
        {["email", "sms", "whatsapp", "portal"].map((ch) => {
          const Icon = CHANNEL_ICON[ch] || MessageSquare;
          return (
            <div key={ch} className="admin-stat p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#ecfdf5]/55">{ch}</p>
                <Icon className="h-3.5 w-3.5 text-[#2dd4bf]" />
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{byChannel[ch] || 0}</p>
            </div>
          );
        })}
      </div>

      <AdminPanel
        title="Recent conversations"
        description="Send new messages directly from a customer's CRM record"
        action={
          <Link
            href="/admin/customers"
            className="inline-flex items-center gap-1 rounded-full bg-[#2dd4bf]/15 px-3 py-1 text-xs font-semibold text-[#2dd4bf] transition hover:bg-[#2dd4bf]/25"
          >
            <User className="h-3 w-3" /> Open CRM
          </Link>
        }
      >
        {conversations.length === 0 ? (
          <AdminEmptyState
            icon={Inbox}
            title="No conversations yet"
            description="When staff message a customer from their CRM record, the thread appears here."
          />
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => {
              const Icon = CHANNEL_ICON[c.channel] || MessageSquare;
              return (
                <Link
                  key={c.id}
                  href={c.customerId ? `/admin/customers/${c.customerId}` : "/admin/messages"}
                  className="group flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition hover:border-[#2dd4bf]/30 hover:bg-white/[0.04]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2dd4bf]/20 to-[#0f766e]/20 text-[#2dd4bf]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white">
                        {c.customer?.fullName || "Unknown customer"}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[c.status] || "bg-slate-500/15 text-slate-300"}`}>
                        {c.status}
                      </span>
                      {c.assignedTo && (
                        <span className="text-[10px] text-[#ecfdf5]/45">
                          Assigned to {c.assignedTo.email}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-[#ecfdf5]/65">
                      {c.subject || c.messages[0]?.body?.slice(0, 100) || "No messages"}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-[#ecfdf5]/35">
                      <Clock className="h-2.5 w-2.5" />
                      {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : "—"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#ecfdf5]/30 transition group-hover:translate-x-0.5 group-hover:text-[#2dd4bf]" />
                </Link>
              );
            })}
          </div>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
