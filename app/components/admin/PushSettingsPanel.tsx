"use client";

import { useState } from "react";
import {
  Bell,
  Send,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Info,
} from "lucide-react";
import { AdminPanel } from "@/app/components/admin/AdminUI";
import { PushStatusPill } from "@/app/components/PushNotificationCenter";
import { usePushNotifications } from "@/app/lib/firebase/usePush";
import { formatDateTime } from "@/app/lib/time";

type Device = {
  id: string;
  token: string;
  label: string | null;
  lastSeenAt: string | Date;
  createdAt: string | Date;
};

export function PushSettingsPanel({ devices }: { devices: Device[] }) {
  const { status, enable, sendTest } = usePushNotifications();
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [unregistering, setUnregistering] = useState<string | null>(null);

  const onSendTest = async () => {
    setSending(true);
    setResult(null);
    const r = await sendTest();
    setSending(false);
    const sent = typeof r?.sent === "number" ? r.sent : 0;
    if (sent > 0) {
      setResult({ ok: true, msg: `Test push delivered to ${sent} device${sent === 1 ? "" : "s"}.` });
    } else if (r?.error) {
      setResult({ ok: false, msg: String(r.error) });
    } else {
      setResult({ ok: false, msg: "No registered devices. Enable push first." });
    }
  };

  const onUnregister = async (token: string) => {
    setUnregistering(token);
    try {
      await fetch("/api/push/unregister", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setResult({ ok: true, msg: "Device removed. Reload to see updated list." });
    } catch {
      setResult({ ok: false, msg: "Failed to remove device." });
    }
    setUnregistering(null);
  };

  return (
    <AdminPanel
      title="Push notifications"
      description="Firebase Cloud Messaging"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm admin-muted">Status</span>
          <PushStatusPill status={status} dark />
        </div>

        <p className="text-sm admin-muted">
          Enable browser push to receive real-time alerts when customers submit refills, escalations, or
          enquiries — even when this tab is in the background.
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {status !== "granted" && status !== "unsupported" && (
            <button
              type="button"
              onClick={() => enable()}
              className="btn-admin min-h-11"
            >
              <Bell className="h-3.5 w-3.5" /> Enable push
            </button>
          )}
          <button
            type="button"
            onClick={onSendTest}
            disabled={sending || status !== "granted"}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--admin-inset-2)] px-3 text-sm font-semibold admin-text transition hover:bg-[var(--admin-inset-2)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send test
          </button>
        </div>

        {/* Result */}
        {result && (
          <div
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
              result.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                : "border-rose-500/30 bg-rose-500/10 text-rose-700"
            }`}
          >
            {result.ok ? (
              <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertCircle className="mt-1 h-3.5 w-3.5 shrink-0" />
            )}
            <span>{result.msg}</span>
          </div>
        )}

        {/* Device list */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wide admin-soft">
              Registered devices
            </span>
            <span className="rounded-full bg-[var(--admin-inset)] px-2 py-1 text-sm admin-muted">
              {devices.length}
            </span>
          </div>
          {devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--admin-border)] px-4 py-6 text-center">
              <Smartphone className="h-6 w-6 admin-soft" />
              <p className="mt-2 text-sm admin-muted">No devices registered yet.</p>
              <p className="mt-1 text-sm admin-soft">
                Enable push on this device to add it to the list.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {devices.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-[var(--admin-inset)] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium admin-text">
                      <Smartphone className="mr-1 inline h-3 w-3" />
                      {d.label || "Device"}
                    </p>
                    <p className="truncate font-mono text-sm admin-soft">{d.token.slice(0, 24)}…</p>
                    <p className="mt-1 text-sm admin-soft">
                      Last seen {formatDateTime(d.lastSeenAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUnregister(d.token)}
                    disabled={unregistering === d.token}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl admin-soft transition hover:bg-rose-500/10 hover:text-rose-600"
                    title="Remove device"
                    aria-label="Remove device"
                  >
                    {unregistering === d.token ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg bg-[var(--admin-inset)] p-3 text-sm admin-muted">
          <div className="flex items-start gap-2">
            <Info className="mt-1 h-3 w-3 shrink-0 admin-accent-text" />
            <div>
              <p className="font-medium admin-text">How it works</p>
              <p className="mt-1">
                When a customer submits a refill or enquiry, this device receives a push via Firebase
                Cloud Messaging — no need to refresh the page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminPanel>
  );
}
