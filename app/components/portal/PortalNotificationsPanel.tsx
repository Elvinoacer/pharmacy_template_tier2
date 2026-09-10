"use client";

import { useState } from "react";
import { Modal } from "@/app/components/Modal";
import { Pagination } from "@/app/components/Pagination";
import { Markdown } from "@/app/components/Markdown";
import { toast } from "@/app/components/Toaster";
import {
  Bell,
  Mail,
  Phone,
  MessageCircle,
  Megaphone,
  Pill,
  CalendarClock,
  Sparkles,
  MessageSquare,
  HeartPulse,
  Trash2,
  CheckCheck,
  Search,
  X,
  Clock,
} from "lucide-react";
import { formatDateTime, formatTimeAgo } from "@/app/lib/time";

export type NotifRow = {
  id: string;
  channel: string;
  type: string;
  title: string;
  body: string;
  fullBody: string | null;
  status: string;
  openedAt: string | null;
  createdAt: string;
};

const channelIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageCircle,
  in_app: Bell,
  push: Bell,
  portal: MessageSquare,
};

const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  refill: Pill,
  message: MessageSquare,
  reminder: CalendarClock,
  campaign: Megaphone,
  loyalty: Sparkles,
  symptom_staff_reply: HeartPulse,
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  sent: "bg-blue-100 text-blue-800",
  delivered: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-700",
  opened: "bg-cyan-100 text-cyan-800",
  clicked: "bg-violet-100 text-violet-800",
};

export function PortalNotificationsPanel({
  initial,
  total,
  page,
  pageSize,
  basePath,
  queryParams,
}: {
  initial: NotifRow[];
  total: number;
  page: number;
  pageSize: number;
  basePath: string;
  queryParams: Record<string, string | undefined>;
}) {
  const [selected, setSelected] = useState<NotifRow | null>(null);

  const markAllRead = async () => {
    try {
      const r = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, scope: "customer" }),
      });
      if (!r.ok) throw new Error();
      toast.success("All notifications marked as read.");
      setTimeout(() => window.location.reload(), 800);
    } catch {
      toast.error("Could not mark as read.");
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, scope: "customer" }),
      });
    } catch {}
  };

  const openModal = async (n: NotifRow) => {
    setSelected(n);
    if (!n.openedAt) {
      await markOneRead(n.id);
    }
  };

  const deleteOne = async (id: string) => {
    try {
      const r = await fetch("/api/notifications/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error();
      toast.success("Notification deleted.");
      setSelected(null);
      setTimeout(() => window.location.reload(), 600);
    } catch {
      toast.error("Could not delete.");
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      {/* Search + actions */}
      <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <form className="relative min-w-0 flex-1 sm:min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-2)]" />
          <input
            name="q"
            defaultValue={queryParams.q || ""}
            placeholder="Search notifications…"
            className="input-premium min-w-0 pl-9"
          />
        </form>
        <button
          type="button"
          onClick={markAllRead}
          className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-deep)] transition hover:brightness-95 sm:w-auto"
        >
          <CheckCheck className="h-3.5 w-3.5" /> Mark all read
        </button>
      </div>

      {/* Active filter chip */}
      {queryParams.q && (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[var(--muted-2)]">Searching:</span>
          <a
            href={basePath}
            className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-[var(--card-elev)] px-2 py-1 text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <span className="truncate">&ldquo;{queryParams.q}&rdquo;</span> <X className="h-2.5 w-2.5 shrink-0" />
          </a>
        </div>
      )}

      {/* List */}
      {initial.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] p-6 text-center sm:p-10">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--card-elev)] text-[var(--muted-2)]">
            <Bell className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">No notifications</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            Refill updates, pharmacist check-in replies, and reminders will appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {initial.map((n) => {
            const TypeIcon = typeIcon[n.type] || Bell;
            const ChannelIcon = channelIcon[n.channel] || Bell;
            const isUnread = !n.openedAt;
            return (
              <li
                key={n.id}
                className={`group flex min-w-0 cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-3 transition hover:border-[#0d6e5a]/30 sm:gap-3 sm:px-3.5 ${
                  isUnread
                    ? "border-[#0d6e5a]/30 bg-[var(--brand-tint)]"
                    : "border-[var(--line)] bg-[var(--card-elev)]"
                }`}
                onClick={() => openModal(n)}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-deep)]">
                  <TypeIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                    <p className={`min-w-0 break-words text-sm ${isUnread ? "font-bold" : "font-semibold"} text-[var(--foreground)]`}>
                      {n.title}
                      {isUnread && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-rose-500" title="Unread" />}
                    </p>
                    <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-[var(--card)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted-2)]">
                      <ChannelIcon className="h-2.5 w-2.5" />
                      {n.channel}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 break-words text-xs leading-relaxed text-[var(--muted)]">{n.body}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-[var(--muted-2)]">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTimeAgo(n.createdAt)}
                    </span>
                    {n.status === "failed" && (
                      <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700">
                        failed
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteOne(n.id);
                  }}
                  className="ml-auto inline-flex shrink-0 items-center justify-center rounded-full p-1 text-[var(--muted-2)] opacity-100 transition hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  title="Delete"
                  aria-label={`Delete ${n.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        page={page}
        total={total}
        pageSize={pageSize}
        basePath={basePath}
        queryParams={queryParams}
        variant="portal"
      />

      {/* Detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title}
        footer={
          <button
            type="button"
            onClick={() => selected && deleteOne(selected.id)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--card-elev)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        }
      >
        {selected && (
          <div className="min-w-0 space-y-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--card-elev)] px-2 py-0.5 text-[var(--muted)] capitalize">
                {(() => { const I = channelIcon[selected.channel] || Bell; return <I className="h-2.5 w-2.5" />; })()} {selected.channel}
              </span>
              <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${STATUS_COLOR[selected.status] || "bg-slate-100 text-slate-600"}`}>
                {selected.status}
              </span>
              <span className="break-words text-[var(--muted-2)]">· {formatDateTime(selected.createdAt)}</span>
            </div>
            <div className="min-w-0 break-words">
              <Markdown>{selected.fullBody || selected.body}</Markdown>
            </div>
            {selected.type === "symptom_staff_reply" && (
              <a
                href="/portal/feel"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#0d6e5a] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#084c3f] sm:w-auto"
              >
                <HeartPulse className="h-3.5 w-3.5" />
                Open How do you feel
              </a>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
