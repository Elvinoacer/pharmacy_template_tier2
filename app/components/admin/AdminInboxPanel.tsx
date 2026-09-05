"use client";

import Link from "next/link";
import { Pagination } from "@/app/components/Pagination";
import { toast } from "@/app/components/Toaster";
import { Inbox, CheckCheck, ExternalLink } from "lucide-react";
import { formatDateTime } from "@/app/lib/time";

export type AdminNotifRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: string;
  isRead: boolean;
  createdAt: string; // ISO
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
  info: "bg-blue-500/15 text-blue-700",
  warning: "bg-amber-500/15 text-amber-700",
  critical: "bg-rose-500/15 text-rose-600",
};

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

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={markAllRead}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-3 py-1.5 text-xs font-semibold admin-muted transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
        >
          <CheckCheck className="h-3 w-3" /> Mark all read
        </button>
      </div>

      <div tabIndex={0} role="region" aria-label="Scrollable records" className="admin-table-region overflow-x-auto scroll-admin">
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
            {initial.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center">
                  <div className="admin-empty">
                    <span className="admin-icon-well flex h-12 w-12">
                      <Inbox className="h-6 w-6" />
                    </span>
                    <p className="mt-3 text-sm font-semibold admin-text">Your inbox is clear</p>
                    <p className="mt-1 text-xs admin-muted">No new admin notifications.</p>
                  </div>
                </td>
              </tr>
            ) : (
              initial.map((n) => {
                const href = relatedHref(n);
                return (
                  <tr
                    key={n.id}
                    className={`transition ${!n.isRead ? "bg-[var(--admin-inset)]/50 font-medium" : ""}`}
                  >
                    <td>
                      <p className="text-xs capitalize admin-soft">{n.type.replace(/_/g, " ")}</p>
                    </td>
                    <td>
                      <p className="flex items-center gap-1.5 text-sm admin-text">
                        <span className="truncate max-w-[280px]">{n.title}</span>
                        {!n.isRead && (
                          <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </p>
                      <p className="truncate text-xs admin-muted max-w-[280px]">{n.body}</p>
                      {href && (
                        <Link
                          href={href}
                          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold admin-accent-text hover:underline"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${SEVERITY_COLOR[n.severity] || "bg-slate-500/15 text-slate-600"}`}>
                        {n.severity}
                      </span>
                    </td>
                    <td className="text-xs admin-muted">
                      {formatDateTime(n.createdAt)}
                    </td>
                    <td className="text-right">
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-inset)] px-2 py-1 text-xs font-medium admin-muted hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
                        >
                          <CheckCheck className="h-3 w-3" /> Mark read
                        </button>
                      )}
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
    </div>
  );
}
