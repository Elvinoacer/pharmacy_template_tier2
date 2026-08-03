"use client";
import { formatDateTime } from "@/app/lib/time";

/**
 * Admin notifications panel.
 *
 * Replaces the previous static outbound-log table with a full inbox:
 *   - Filter by status (failed / sent / delivered / pending) and channel
 *   - Search by title/body
 *   - Status badges on every row
 *   - Pagination
 *   - Click any row → modal with full body, mark-as-read on open
 *   - "Mark all as read" + "Retry all failed" + "Delete" actions
 *
 * This component receives the initial server-fetched rows + counts as props
 * and does its own client-side fetch for read/retry/delete.
 */

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
  RefreshCw,
  Search,
  X,
  AlertTriangle,
} from "lucide-react";

export type NotifRow = {
  id: string;
  channel: string;
  type: string;
  title: string;
  body: string;
  fullBody: string | null;
  status: string;
  customerName: string | null;
  createdAt: string; // ISO
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
  pending: "bg-amber-500/15 text-amber-700",
  sent: "bg-blue-500/15 text-blue-700",
  delivered: "bg-emerald-500/15 text-emerald-700",
  failed: "bg-rose-500/15 text-rose-600",
  opened: "bg-cyan-500/15 text-cyan-700",
  clicked: "bg-violet-500/15 text-violet-700",
};

const STATUS_OPTIONS = ["pending", "sent", "delivered", "failed", "opened", "clicked"];
const CHANNEL_OPTIONS = ["email", "sms", "whatsapp", "in_app", "push", "portal"];

export function AdminNotificationsPanel({
  initial,
  total,
  page,
  pageSize,
  basePath,
  queryParams,
  failedCount,
}: {
  initial: NotifRow[];
  total: number;
  page: number;
  pageSize: number;
  basePath: string;
  queryParams: Record<string, string | undefined>;
  failedCount: number;
}) {
  const [selected, setSelected] = useState<NotifRow | null>(null);
  const [retrying, setRetrying] = useState(false);

  const openModal = async (n: NotifRow) => {
    setSelected(n);
  };

  const retryAllFailed = async () => {
    setRetrying(true);
    try {
      const r = await fetch("/api/admin/notifications/retry", { method: "POST" });
      if (!r.ok) throw new Error();
      const j = (await r.json()) as { recovered?: number; still_failed?: number; attempted?: number };
      if (j.attempted === 0) {
        toast.info("No failed notifications to retry.");
      } else {
        toast.success(`Retried ${j.attempted} failed: ${j.recovered ?? 0} recovered, ${j.still_failed ?? 0} still failing.`);
      }
      // Reload so the badges update.
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      toast.error("Retry failed — check server logs.");
    } finally {
      setRetrying(false);
    }
  };

  const deleteOne = async (id: string) => {
    try {
      const r = await fetch("/api/admin/notifications/delete", {
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

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { ...queryParams, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-4">
      {/* Filter + search bar */}
      <div className="flex flex-wrap items-center gap-2">
        <form className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            name="q"
            defaultValue={queryParams.q || ""}
            placeholder="Search title or body…"
            className="input-admin pl-9"
          />
        </form>
        <select
          name="status"
          defaultValue={queryParams.status || ""}
          onChange={(e) => {
            const v = e.target.value;
            window.location.href = buildUrl({ status: v || undefined, page: undefined });
          }}
          className="input-admin !w-auto"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          name="channel"
          defaultValue={queryParams.channel || ""}
          onChange={(e) => {
            const v = e.target.value;
            window.location.href = buildUrl({ channel: v || undefined, page: undefined });
          }}
          className="input-admin !w-auto"
        >
          <option value="">All channels</option>
          {CHANNEL_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {failedCount > 0 && (
          <button
            type="button"
            onClick={retryAllFailed}
            disabled={retrying}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            title={`Retry all ${failedCount} failed sends`}
          >
            <RefreshCw className={`h-3 w-3 ${retrying ? "animate-spin" : ""}`} />
            Retry all failed ({failedCount})
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {(queryParams.q || queryParams.status || queryParams.channel) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="admin-soft">Active filters:</span>
          {queryParams.q && (
            <a href={buildUrl({ q: undefined })} className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 admin-muted hover:text-[var(--admin-text)]">
              q=&ldquo;{queryParams.q}&rdquo; <X className="h-2.5 w-2.5" />
            </a>
          )}
          {queryParams.status && (
            <a href={buildUrl({ status: undefined })} className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 admin-muted hover:text-[var(--admin-text)]">
              status={queryParams.status} <X className="h-2.5 w-2.5" />
            </a>
          )}
          {queryParams.channel && (
            <a href={buildUrl({ channel: undefined })} className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 admin-muted hover:text-[var(--admin-text)]">
              channel={queryParams.channel} <X className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      )}

      {/* List */}
      <div className="overflow-x-auto scroll-admin">
        <table className="table-admin">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Channel</th>
              <th>Message</th>
              <th>Status</th>
              <th>When</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {initial.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center">
                  <div className="admin-empty">
                    <span className="admin-icon-well flex h-12 w-12">
                      <Bell className="h-6 w-6" />
                    </span>
                    <p className="mt-3 text-sm font-semibold admin-text">No notifications match your filters</p>
                    <p className="mt-1 text-xs admin-muted">Try clearing the status or search filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              initial.map((n) => {
                const ChannelIcon = channelIcon[n.channel] || Bell;
                const TypeIcon = typeIcon[n.type] || Bell;
                return (
                  <tr
                    key={n.id}
                    className="cursor-pointer hover:bg-[var(--admin-hover)]"
                    onClick={() => openModal(n)}
                  >
                    <td>
                      <p className="font-medium admin-text">{n.customerName || "—"}</p>
                      <p className="text-[10px] capitalize admin-soft">{n.type}</p>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-inset)] px-2 py-0.5 text-[10px] font-medium capitalize admin-muted">
                        <ChannelIcon className="h-2.5 w-2.5" /> {n.channel}
                      </span>
                    </td>
                    <td>
                      <p className="flex items-center gap-1.5 text-sm admin-text">
                        <TypeIcon className="h-3 w-3 admin-accent-text" />
                        <span className="truncate max-w-[280px]">{n.title}</span>
                      </p>
                      <p className="truncate text-xs admin-muted max-w-[280px]">{n.body}</p>
                    </td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLOR[n.status] || "bg-slate-500/15 text-slate-600"}`}>
                        {n.status}
                      </span>
                      {n.status === "failed" && (
                        <AlertTriangle className="ml-1 inline h-3 w-3 text-rose-500" />
                      )}
                    </td>
                    <td className="text-xs admin-muted">
                      {formatDateTime(n.createdAt)}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteOne(n.id);
                        }}
                        className="rounded-full p-1 admin-soft transition hover:bg-rose-500/10 hover:text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        total={total}
        pageSize={pageSize}
        basePath={basePath}
        queryParams={queryParams}
        variant="admin"
      />

      {/* Detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title}
        footer={
          <>
            {selected?.status === "failed" && (
              <button
                type="button"
                onClick={() => retryAllFailed()}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600"
              >
                <RefreshCw className="h-3 w-3" /> Retry failed
              </button>
            )}
            <button
              type="button"
              onClick={() => selected && deleteOne(selected.id)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-3 py-1.5 text-xs font-semibold admin-muted hover:bg-rose-500/10 hover:text-rose-600"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </>
        }
      >
        {selected && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-inset)] px-2 py-0.5 admin-muted capitalize">
                {(() => {
                  const I = channelIcon[selected.channel] || Bell;
                  return <I className="h-2.5 w-2.5" />;
                })()} {selected.channel}
              </span>
              <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${STATUS_COLOR[selected.status] || "bg-slate-500/15 text-slate-600"}`}>
                {selected.status}
              </span>
              {selected.customerName && (
                <span className="admin-muted">→ {selected.customerName}</span>
              )}
              <span className="admin-soft">· {formatDateTime(selected.createdAt)}</span>
            </div>
            <Markdown>{selected.fullBody || selected.body}</Markdown>
          </div>
        )}
      </Modal>
    </div>
  );
}
