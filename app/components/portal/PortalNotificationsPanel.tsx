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
    <div className="space-y-4">
      {/* Search + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <form className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8a9a92]" />
          <input
            name="q"
            defaultValue={queryParams.q || ""}
            placeholder="Search notifications…"
            className="input-premium pl-9"
          />
        </form>
        <button
          type="button"
          onClick={markAllRead}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f4ef] px-3 py-1.5 text-xs font-semibold text-[#0d6e5a] transition hover:bg-[#d5efe6]"
        >
          <CheckCheck className="h-3.5 w-3.5" /> Mark all read
        </button>
      </div>

      {/* Active filter chip */}
      {queryParams.q && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[#8a9a92]">Searching:</span>
          <a
            href={basePath}
            className="inline-flex items-center gap-1 rounded-full bg-[#e3ebe6] px-2 py-0.5 text-[#5a6b62] hover:text-[#0c1a14]"
          >
            &ldquo;{queryParams.q}&rdquo; <X className="h-2.5 w-2.5" />
          </a>
        </div>
      )}

      {/* List */}
      {initial.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e3ebe6] p-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f7f4] text-[#8a9a92]">
            <Bell className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold text-[#0c1a14]">No notifications</p>
          <p className="mt-1 text-xs text-[#5a6b62]">Refill updates, reminders, and messages will appear here.</p>
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
                className={`group flex items-start gap-3 rounded-xl border px-3.5 py-3 transition cursor-pointer hover:border-[#0d6e5a]/30 ${
                  isUnread ? "border-[#0d6e5a]/30 bg-[#f0faf6]" : "border-[#e3ebe6] bg-[#fafbfa]"
                }`}
                onClick={() => openModal(n)}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e6f4ef] text-[#0d6e5a]">
                  <TypeIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${isUnread ? "font-bold" : "font-semibold"} text-[#0c1a14]`}>
                      {n.title}
                      {isUnread && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-rose-500" title="Unread" />}
                    </p>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#8a9a92]">
                      <ChannelIcon className="h-2.5 w-2.5" />
                      {n.channel}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-[#5a6b62]">{n.body}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-[#8a9a92]">
                    <Clock className="h-2.5 w-2.5" />
                    {formatTimeAgo(n.createdAt)}
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
                  className="rounded-full p-1 text-[#8a9a92] opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                  title="Delete"
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
            className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f7f4] px-3 py-1.5 text-xs font-semibold text-[#5a6b62] hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        }
      >
        {selected && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f7f4] px-2 py-0.5 text-[#5a6b62] capitalize">
                {(() => { const I = channelIcon[selected.channel] || Bell; return <I className="h-2.5 w-2.5" />; })()} {selected.channel}
              </span>
              <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${STATUS_COLOR[selected.status] || "bg-slate-100 text-slate-600"}`}>
                {selected.status}
              </span>
              <span className="text-[#8a9a92]">· {formatDateTime(selected.createdAt)}</span>
            </div>
            <Markdown>{selected.fullBody || selected.body}</Markdown>
          </div>
        )}
      </Modal>
    </div>
  );
}
