import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
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
  open: "bg-emerald-500/15 text-emerald-700",
  pending: "bg-amber-500/15 text-amber-700",
  resolved: "bg-blue-500/15 text-blue-700",
  closed: "bg-slate-500/15 text-slate-600",
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
          <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Total threads</p>
          <p className="mt-1 text-2xl font-bold admin-text">{conversations.length}</p>
        </div>
        {["email", "sms", "whatsapp", "portal"].map((ch) => {
          const Icon = CHANNEL_ICON[ch] || MessageSquare;
          return (
            <div key={ch} className="admin-stat p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">{ch}</p>
                <Icon className="h-3.5 w-3.5 admin-accent-text" />
              </div>
              <p className="mt-1 text-2xl font-bold admin-text">{byChannel[ch] || 0}</p>
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
            className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-accent-soft)] px-3 py-1 text-xs font-semibold admin-accent-text transition hover:bg-[var(--admin-hover)]"
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
                  className="group flex flex-wrap items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-4 py-3 transition hover:border-[var(--admin-accent)] hover:bg-[var(--admin-inset)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--admin-accent-soft)] to-[var(--admin-accent-soft)] admin-accent-text">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold admin-text">
                        {c.customer?.fullName || "Unknown customer"}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[c.status] || "bg-slate-500/15 text-slate-600"}`}>
                        {c.status}
                      </span>
                      {c.assignedTo && (
                        <span className="text-[10px] admin-soft">
                          Assigned to {c.assignedTo.email}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm admin-muted">
                      {c.subject || c.messages[0]?.body?.slice(0, 100) || "No messages"}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-wide admin-soft">
                      <Clock className="h-2.5 w-2.5" />
                      {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : "—"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 admin-soft transition group-hover:translate-x-0.5 group-hover:admin-accent-text" />
                </Link>
              );
            })}
          </div>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
