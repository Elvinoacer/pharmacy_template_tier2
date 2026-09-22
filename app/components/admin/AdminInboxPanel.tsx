"use client";

import Link from "next/link";
import { Pagination } from "@/app/components/Pagination";
import { toast } from "@/app/components/Toaster";
import { Inbox, CheckCheck, ExternalLink, BellRing, Clock3 } from "lucide-react";
import { formatDateTime } from "@/app/lib/time";

export type AdminNotifRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: string;
  isRead: boolean;
  createdAt: string;
  relatedType?: string | null;
  relatedId?: string | null;
};

function relatedHref(n: AdminNotifRow): string | null {
  if (n.relatedType === "symptom_session" && n.relatedId) {
    return `/admin/feel/${n.relatedId}`;
  }
  if (n.type === "symptom_escalation" || n.type === "symptom_checkin") {
    return n.relatedId ? `/admin/feel/${n.relatedId}` : "/admin/feel";
  }
  if (n.type === "ai_escalation") return "/admin/ai";
  if (n.type === "enquiry_new") return "/admin/enquiries";
  if (n.type === "refill_new") return "/admin/refills";
  if (n.type === "stock_low") return "/admin/inventory";
  return null;
}

const SEVERITY_COLOR: Record<string, string> = {
  info: "bg-blue-500/12 text-blue-700 ring-1 ring-inset ring-blue-500/20 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/20",
  warning:
    "bg-amber-500/12 text-amber-800 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
  critical:
    "bg-rose-500/12 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20",
};

function severityClass(severity: string) {
  return (
    SEVERITY_COLOR[severity] ||
    "bg-slate-500/10 text-slate-600 ring-1 ring-inset ring-slate-500/15 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20"
  );
}

export function AdminInboxPanel({
  initial,
  total,
  page,
  pageSize,
  basePath,
  queryParams,
}: {
  initial: AdminNotifRow[];
  total: number;
  page: number;
  pageSize: number;
  basePath: string;
  queryParams: Record<string, string | undefined>;
}) {
  const markRead = async (id: string) => {
    try {
      const r = await fetch("/api/admin/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (r.ok) {
        window.location.reload();
      } else {
        toast.error("Could not mark item as read.");
      }
    } catch {
      toast.error("Could not mark item as read.");
    }
  };

  const markAllRead = async () => {
    try {
      const r = await fetch("/api/admin/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (r.ok) {
        toast.success("All inbox items marked as read.");
        window.location.reload();
      } else {
        toast.error("Could not mark items as read.");
      }
    } catch {
      toast.error("Could not mark items as read.");
    }
  };

  const unread = initial.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm admin-muted">
          <BellRing className="h-3.5 w-3.5 admin-accent-text" />
          <span>{unread} unread on this page</span>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={initial.length === 0 || unread === 0}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 py-2 text-sm font-semibold admin-muted transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)] disabled:opacity-50 sm:w-auto"
        >
          <CheckCheck className="h-3.5 w-3.5" /> Mark all read
        </button>
      </div>

      {initial.length === 0 ? (
        <div className="admin-empty rounded-2xl border border-dashed border-[var(--admin-border)] px-4 py-8 text-center">
          <span className="admin-icon-well mx-auto flex h-12 w-12">
            <Inbox className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold admin-text">Your inbox is clear</p>
          <p className="mt-1 text-sm admin-muted">No admin notifications need attention.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {initial.map((n) => {
              const href = relatedHref(n);
              return (
                <article
                  key={n.id}
                  className={`rounded-2xl border p-4 transition-[border-color,background-color,box-shadow] sm:p-5 ${
                    n.isRead
                      ? "border-[var(--admin-border)] bg-[var(--admin-card)]"
                      : "border-[var(--admin-border-2)] bg-[var(--admin-inset)] shadow-sm"
                  }`}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold uppercase tracking-[0.08em] admin-soft">
                          {n.type.replace(/_/g, " ")}
                        </span>
                        {!n.isRead && <span className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-300" />}
                      </div>
                      <h3 className="mt-2 break-words text-sm font-semibold leading-5 admin-text">{n.title}</h3>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold capitalize ${severityClass(n.severity)}`}>
                      {n.severity}
                    </span>
                  </div>

                  <p className="mt-2 break-words text-base leading-6 admin-muted">{n.body}</p>

                  <div className="mt-3 flex items-center gap-2 text-sm admin-soft">
                    <Clock3 className="h-3 w-3" />
                    {formatDateTime(n.createdAt)}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {href && (
                      <Link
                        href={href}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--admin-accent-soft)] px-3 py-2 text-sm font-semibold admin-accent-text"
                      >
                        Open item <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 py-2 text-sm font-semibold admin-muted transition hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
                      >
                        <CheckCheck className="h-3.5 w-3.5" /> Mark read
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <div tabIndex={0} role="region" aria-label="Inbox records" className="admin-table-region hidden overflow-x-auto scroll-admin lg:block">
            <table className="table-admin">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Severity</th>
                  <th>When</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {initial.map((n) => {
                  const href = relatedHref(n);
                  return (
                    <tr
                      key={n.id}
                      className={`transition ${!n.isRead ? "bg-[var(--admin-inset)]/50 font-medium" : ""}`}
                    >
                      <td>
                        <p className="text-sm capitalize admin-soft">{n.type.replace(/_/g, " ")}</p>
                      </td>
                      <td>
                        <p className="flex items-center gap-2 text-sm admin-text">
                          <span className="max-w-[420px] whitespace-normal break-words">{n.title}</span>
                          {!n.isRead && <span className="inline-block h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-300" />}
                        </p>
                        <p className="max-w-[420px] whitespace-normal break-words text-sm admin-muted">{n.body}</p>
                        {href && (
                          <Link
                            href={href}
                            className="mt-1 inline-flex items-center gap-1 text-sm font-semibold admin-accent-text hover:underline"
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </td>
                      <td>
                        <span className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${severityClass(n.severity)}`}>
                          {n.severity}
                        </span>
                      </td>
                      <td className="text-sm admin-muted">{formatDateTime(n.createdAt)}</td>
                      <td className="text-right">
                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={() => markRead(n.id)}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--admin-inset)] px-3 py-2 text-sm font-medium admin-muted hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
                          >
                            <CheckCheck className="h-3 w-3" /> Mark read
                          </button>
                        )}
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
    </div>
  );
}
