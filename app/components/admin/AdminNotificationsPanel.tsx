"use client";
import { formatDateTime } from "@/app/lib/time";

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
  ChevronRight,
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
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  sent: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  failed: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  opened: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  clicked: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
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
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <form className="relative min-w-0 sm:col-span-2 lg:col-span-1">
          {queryParams.status && <input type="hidden" name="status" value={queryParams.status} />}
          {queryParams.channel && <input type="hidden" name="channel" value={queryParams.channel} />}
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            name="q"
            defaultValue={queryParams.q || ""}
            placeholder="Search title or body…"
            className="input-admin min-h-11 w-full pl-9"
          />
        </form>
        <select
          name="status"
          defaultValue={queryParams.status || ""}
          onChange={(e) => {
            const v = e.target.value;
            window.location.href = buildUrl({ status: v || undefined, page: undefined });
          }}
          className="input-admin min-h-11 !w-full capitalize lg:!w-auto"
          aria-label="Filter notification status"
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
          className="input-admin min-h-11 !w-full capitalize lg:!w-auto"
          aria-label="Filter notification channel"
        >
          <option value="">All channels</option>
          {CHANNEL_OPTIONS.map((c) => (
            <option key={c} value={c}>{c.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      {failedCount > 0 && (
        <button
          type="button"
          onClick={retryAllFailed}
          disabled={retrying}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-4 text-sm font-bold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60 sm:w-auto"
          title={`Retry all ${failedCount} failed sends`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`} />
          Retry all failed ({failedCount})
        </button>
      )}

      {(queryParams.q || queryParams.status || queryParams.channel) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="admin-soft">Filters:</span>
          {queryParams.q && (
            <a href={buildUrl({ q: undefined, page: undefined })} className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-full bg-[var(--admin-inset-2)] px-3 admin-muted transition hover:text-[var(--admin-text)]">
              <span className="truncate">“{queryParams.q}”</span> <X className="h-2.5 w-2.5 shrink-0" />
            </a>
          )}
          {queryParams.status && (
            <a href={buildUrl({ status: undefined, page: undefined })} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[var(--admin-inset-2)] px-3 admin-muted transition hover:text-[var(--admin-text)]">
              {queryParams.status} <X className="h-2.5 w-2.5" />
            </a>
          )}
          {queryParams.channel && (
            <a href={buildUrl({ channel: undefined, page: undefined })} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[var(--admin-inset-2)] px-3 admin-muted transition hover:text-[var(--admin-text)]">
              {queryParams.channel.replace("_", " ")} <X className="h-2.5 w-2.5" />
            </a>
          )}
          <a href={basePath} className="ml-auto inline-flex min-h-11 items-center text-sm font-semibold admin-accent-text hover:underline">Clear all</a>
        </div>
      )}

      {initial.length === 0 ? (
        <div className="admin-empty rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-inset)] px-4 py-8 text-center">
          <span className="admin-icon-well mx-auto flex h-12 w-12 items-center justify-center rounded-2xl">
            <Bell className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold admin-text">No notifications match your filters</p>
          <p className="mt-1 text-sm admin-muted">Try clearing the status, channel, or search filter.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {initial.map((n) => {
              const ChannelIcon = channelIcon[n.channel] || Bell;
              const TypeIcon = typeIcon[n.type] || Bell;
              return (
                <article
                  key={n.id}
                  className="group rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 transition-all hover:border-[var(--admin-accent)] hover:bg-[var(--admin-hover)]"
                >
                  <button type="button" onClick={() => openModal(n)} className="w-full text-left">
                    <div className="flex items-start gap-3">
                      <span className="admin-icon-well flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                        <TypeIcon className="h-4.5 w-4.5 admin-accent-text" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-bold admin-text">{n.title}</p>
                            <p className="mt-1 break-words text-sm admin-muted">{n.customerName || "No customer"}</p>
                          </div>
                          <ChevronRight className="mt-1 h-4 w-4 shrink-0 admin-soft transition-transform group-hover:translate-x-0.5" />
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed admin-muted">{n.body}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 pl-12">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-card)] px-2 py-1 text-sm font-semibold capitalize admin-muted">
                        <ChannelIcon className="h-2.5 w-2.5" /> {n.channel.replace("_", " ")}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-sm font-bold capitalize ${STATUS_COLOR[n.status] || "bg-slate-500/15 text-slate-700 dark:text-slate-300"}`}>
                        {n.status}
                      </span>
                      <span className="text-sm admin-soft">{formatDateTime(n.createdAt)}</span>
                    </div>
                  </button>
                  <div className="mt-2 flex justify-end border-t border-[var(--admin-border-2)] pt-2">
                    <button
                      type="button"
                      onClick={() => deleteOne(n.id)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold admin-soft transition hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-300"
                      aria-label={`Delete ${n.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div tabIndex={0} role="region" aria-label="Notification records" className="admin-table-region hidden overflow-x-auto scroll-admin lg:block">
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
                {initial.map((n) => {
                  const ChannelIcon = channelIcon[n.channel] || Bell;
                  const TypeIcon = typeIcon[n.type] || Bell;
                  return (
                    <tr
                      key={n.id}
                      className="cursor-pointer transition-colors hover:bg-[var(--admin-hover)]"
                      onClick={() => openModal(n)}
                    >
                      <td>
                        <p className="font-medium admin-text">{n.customerName || "—"}</p>
                        <p className="text-sm capitalize admin-soft">{n.type}</p>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-inset)] px-2 py-1 text-sm font-medium capitalize admin-muted">
                          <ChannelIcon className="h-2.5 w-2.5" /> {n.channel.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <p className="flex items-center gap-2 text-sm admin-text">
                          <TypeIcon className="h-3 w-3 shrink-0 admin-accent-text" />
                          <span className="max-w-[280px] truncate">{n.title}</span>
                        </p>
                        <p className="max-w-[280px] truncate text-sm admin-muted">{n.body}</p>
                      </td>
                      <td>
                        <span className={`rounded-full px-2 py-1 text-sm font-semibold capitalize ${STATUS_COLOR[n.status] || "bg-slate-500/15 text-slate-700 dark:text-slate-300"}`}>
                          {n.status}
                        </span>
                        {n.status === "failed" && <AlertTriangle className="ml-1 inline h-3 w-3 text-rose-500" />}
                      </td>
                      <td className="whitespace-nowrap text-sm admin-muted">{formatDateTime(n.createdAt)}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteOne(n.id);
                          }}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl admin-soft transition hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-300"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Pagination
        page={page}
        total={total}
        pageSize={pageSize}
        basePath={basePath}
        queryParams={queryParams}
        variant="admin"
      />

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title}
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => selected && void deleteOne(selected.id)}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 text-sm font-semibold admin-muted transition hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-300 sm:w-auto"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
            {selected?.status === "failed" && (
              <button
                type="button"
                onClick={() => void retryAllFailed()}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-3 text-sm font-semibold text-white transition hover:bg-rose-600 sm:w-auto"
              >
                <RefreshCw className="h-3 w-3" /> Retry failed
              </button>
            )}
          </div>
        }
      >
        {selected && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-inset)] px-2 py-1 admin-muted capitalize">
                {(() => {
                  const I = channelIcon[selected.channel] || Bell;
                  return <I className="h-2.5 w-2.5" />;
                })()} {selected.channel.replace("_", " ")}
              </span>
              <span className={`rounded-full px-2 py-1 font-semibold capitalize ${STATUS_COLOR[selected.status] || "bg-slate-500/15 text-slate-700 dark:text-slate-300"}`}>
                {selected.status}
              </span>
              {selected.customerName && <span className="admin-muted">→ {selected.customerName}</span>}
              <span className="admin-soft">{formatDateTime(selected.createdAt)}</span>
            </div>
            <div className="overflow-hidden break-words">
              <Markdown>{selected.fullBody || selected.body}</Markdown>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
