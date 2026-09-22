import { formatDateTime } from "@/app/lib/time";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";
import {
  MessageSquare,
  Mail,
  Phone,
  MessageCircle,
  Inbox,
  Clock,
  ArrowRight,
  User,
  Search,
  X,
  MessagesSquare,
} from "lucide-react";
import type { Prisma } from "@/app/generated/prisma/client";

export const metadata = { title: "Communication center" };

const PAGE_SIZE = 25;

const CHANNEL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageCircle,
  portal: MessageSquare,
  ai: MessageSquare,
};

const STATUS_COLOR: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  resolved: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  closed: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const where: Prisma.ConversationWhereInput = sp.q
    ? {
        OR: [
          { subject: { contains: sp.q, mode: "insensitive" } },
          { customer: { fullName: { contains: sp.q, mode: "insensitive" } } },
          { customer: { user: { email: { contains: sp.q, mode: "insensitive" } } } },
          { messages: { some: { body: { contains: sp.q, mode: "insensitive" } } } },
        ],
      }
    : {};

  const [total, channelGroups] = await Promise.all([
    prisma.conversation.count({ where }),
    prisma.conversation.groupBy({ by: ["channel"], _count: true }),
  ]);

  const page = parsePageParam(sp.page, total, PAGE_SIZE);
  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      customer: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      assignedTo: { select: { email: true } },
    },
    orderBy: { lastMessageAt: "desc" },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const byChannel = Object.fromEntries(channelGroups.map((g) => [g.channel, g._count]));
  const queryParams: Record<string, string | undefined> = { q: sp.q };

  return (
    <AdminShell
      user={user}
      title="Conversations"
      subtitle="Find patient conversations across email, SMS, WhatsApp, and the portal."
    >
      <div className="mx-auto w-full max-w-[1280px] space-y-4 sm:space-y-6">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="admin-stat min-w-0 p-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold uppercase tracking-wide admin-muted sm:text-sm">Total threads</p>
              <span className="admin-icon-well flex h-7 w-7 items-center justify-center rounded-lg">
                <MessagesSquare className="h-3.5 w-3.5 admin-accent-text" />
              </span>
            </div>
            <p className="mt-1 text-2xl font-black admin-text">{total}</p>
            <p className="mt-1 text-sm admin-soft sm:text-sm">All communication channels</p>
          </div>
          {["email", "sms", "whatsapp", "portal"].map((ch) => {
            const Icon = CHANNEL_ICON[ch] || MessageSquare;
            return (
              <div key={ch} className="admin-stat min-w-0 p-4 transition-transform hover:-translate-y-0.5 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="break-words text-sm font-bold uppercase tracking-wide admin-muted">{ch}</p>
                  <Icon className="h-3.5 w-3.5 shrink-0 admin-accent-text" />
                </div>
                <p className="mt-1 text-xl font-black admin-text sm:text-2xl">{byChannel[ch] || 0}</p>
              </div>
            );
          })}
        </section>

        <AdminPanel
          title="Recent conversations"
          description="Search first, then open the customer record to continue the conversation."
          action={
            <Link
              href="/admin/customers"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--admin-accent-soft)] px-4 !text-sm font-semibold admin-accent-text transition hover:bg-[var(--admin-hover)]"
            >
              <User className="h-3 w-3" /> Open CRM
            </Link>
          }
        >
          <form className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input
                name="q"
                defaultValue={sp.q || ""}
                placeholder="Search customer, subject, or message…"
                className="min-h-11 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] py-2 pl-9 pr-3 text-base admin-text placeholder:admin-soft focus:border-[var(--admin-accent)] focus:outline-none sm:text-sm"
              />
            </div>
            <button type="submit" className="btn-admin-sm min-h-11 w-full justify-center !text-sm sm:w-auto">
              <Search className="h-3.5 w-3.5" /> Search
            </button>
            {sp.q && (
              <Link href="/admin/messages" className="btn-admin-sm min-h-11 w-full justify-center !bg-[var(--admin-inset-2)] !text-sm sm:w-auto">
                <X className="h-3.5 w-3.5" /> Clear
              </Link>
            )}
          </form>

          {conversations.length === 0 ? (
            <AdminEmptyState
              icon={Inbox}
              title="No conversations yet"
              description={sp.q ? "Try a different search term." : "When staff message a customer from their CRM record, the thread appears here."}
            />
          ) : (
            <div className="space-y-3">
              {conversations.map((c) => {
                const Icon = CHANNEL_ICON[c.channel] || MessageSquare;
                return (
                  <Link
                    key={c.id}
                    href={c.customerId ? `/admin/customers/${c.customerId}` : "/admin/messages"}
                    className="group grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3 transition-all hover:-translate-y-0.5 hover:border-[var(--admin-accent)] hover:bg-[var(--admin-hover)] active:scale-[0.995] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-4"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-accent-soft)] admin-accent-text sm:h-11 sm:w-11">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-2">
                        <p className="max-w-full break-words text-base font-bold admin-text">
                          {c.customer?.fullName || "Unknown customer"}
                        </p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-sm font-bold capitalize sm:text-sm ${STATUS_COLOR[c.status] || "bg-slate-500/15 text-slate-700 dark:text-slate-300"}`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="mt-1 break-words text-base leading-6 admin-muted">
                        {c.subject || c.messages[0]?.body?.slice(0, 100) || "No messages"}
                      </p>
                      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm uppercase tracking-wide admin-soft sm:text-sm">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> {c.lastMessageAt ? formatDateTime(c.lastMessageAt) : "—"}
                        </span>
                        {c.assignedTo && (
                          <span className="max-w-full break-all normal-case tracking-normal">Assigned to {c.assignedTo.email}</span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="col-start-2 h-4 w-4 justify-self-end admin-soft transition group-hover:translate-x-0.5 group-hover:admin-accent-text sm:col-start-3 sm:row-start-1" />
                  </Link>
                );
              })}
            </div>
          )}
          <Pagination
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            basePath="/admin/messages"
            queryParams={queryParams}
            variant="admin"
          />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
