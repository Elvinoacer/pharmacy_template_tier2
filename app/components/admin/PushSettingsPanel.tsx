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
    if (r && r.sent > 0) {
      setResult({ ok: true, msg: `Test push delivered to ${r.sent} device${r.sent === 1 ? "" : "s"}.` });
    } else if (r && r.error) {
      setResult({ ok: false, msg: r.error });
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
          <span className="text-xs text-[#ecfdf5]/55">Status</span>
          <PushStatusPill status={status} />
        </div>

        <p className="text-xs text-[#ecfdf5]/55">
          Enable browser push to receive real-time alerts when customers submit refills, escalations, or
          enquiries — even when this tab is in the background.
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {status !== "granted" && status !== "unsupported" && (
            <button
              type="button"
              onClick={() => enable()}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#0f766e] px-3 py-1.5 text-xs font-semibold text-[#042f2e] transition hover:brightness-110"
            >
              <Bell className="h-3.5 w-3.5" /> Enable push
            </button>
          )}
          <button
            type="button"
            onClick={onSendTest}
            disabled={sending || status !== "granted"}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send test
          </button>
        </div>

        {/* Result */}
        {result && (
          <div
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
              result.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/30 bg-rose-500/10 text-rose-200"
            }`}
          >
            {result.ok ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            <span>{result.msg}</span>
          </div>
        )}

        {/* Device list */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#ecfdf5]/45">
              Registered devices
            </span>
            <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-[#ecfdf5]/70">
              {devices.length}
            </span>
          </div>
          {devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] px-4 py-6 text-center">
              <Smartphone className="h-6 w-6 text-[#ecfdf5]/30" />
              <p className="mt-2 text-xs text-[#ecfdf5]/55">No devices registered yet.</p>
              <p className="mt-0.5 text-[10px] text-[#ecfdf5]/35">
                Enable push on this device to add it to the list.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {devices.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white">
                      <Smartphone className="mr-1 inline h-3 w-3" />
                      {d.label || "Device"}
                    </p>
                    <p className="truncate font-mono text-[10px] text-[#ecfdf5]/35">{d.token.slice(0, 24)}…</p>
                    <p className="mt-0.5 text-[10px] text-[#ecfdf5]/45">
                      Last seen {new Date(d.lastSeenAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUnregister(d.token)}
                    disabled={unregistering === d.token}
                    className="rounded-full p-1.5 text-[#ecfdf5]/40 transition hover:bg-rose-500/10 hover:text-rose-300"
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

        <div className="rounded-lg bg-white/[0.03] p-3 text-xs text-[#ecfdf5]/55">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-3 w-3 shrink-0 text-[#2dd4bf]" />
            <div>
              <p className="font-medium text-[#ecfdf5]/80">How it works</p>
              <p className="mt-0.5">
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
