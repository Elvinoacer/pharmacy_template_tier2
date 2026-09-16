"use client";

import { useActionState, useState } from "react";
import {
  AlertCircle,
  Banknote,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  HelpCircle,
  Info,
  Loader2,
  Power,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Unplug,
} from "lucide-react";
import {
  saveTenantPaymentSettingsAction,
  testTenantPaymentConnectionAction,
  disconnectTenantPaymentAction,
  type PaymentSettingsActionState,
} from "@/app/actions/tenant-admin";
import type { PharmacyPaymentSettingsView } from "@/app/lib/platform/integrations";

export function PaymentSettingsClient({
  pharmacyId,
  initialSettings,
  canManage,
}: {
  pharmacyId: string;
  initialSettings: PharmacyPaymentSettingsView;
  canManage: boolean;
}) {
  const [saveState, saveAction, savePending] = useActionState(saveTenantPaymentSettingsAction, {});
  const [testState, testAction, testPending] = useActionState(testTenantPaymentConnectionAction, {});
  const [disconnectState, disconnectAction, disconnectPending] = useActionState(
    disconnectTenantPaymentAction,
    {},
  );

  const [copiedCallback, setCopiedCallback] = useState(false);
  const [shortcodeType, setShortcodeType] = useState<"paybill" | "till">(
    initialSettings.shortcodeType || "paybill",
  );
  const [environment, setEnvironment] = useState<"sandbox" | "production">(
    initialSettings.environment || "sandbox",
  );
  const [shortcode, setShortcode] = useState(initialSettings.shortcode || "");

  const copyCallbackUrl = () => {
    if (typeof navigator !== "undefined" && initialSettings.callbackUrl) {
      navigator.clipboard.writeText(initialSettings.callbackUrl);
      setCopiedCallback(true);
      setTimeout(() => setCopiedCallback(false), 2000);
    }
  };

  const statusBadge = () => {
    switch (initialSettings.status) {
      case "live_confirmed":
        return {
          label: "Live payment confirmed",
          className: "bg-emerald-100 text-emerald-800 border-emerald-300",
          icon: ShieldCheck,
          description: "M-Pesa payments have settled successfully to your shortcode.",
        };
      case "auth_verified":
        return {
          label: "Authentication verified",
          className: "bg-blue-100 text-blue-800 border-blue-300",
          icon: CheckCircle2,
          description: "OAuth application credentials confirmed with Safaricom.",
        };
      case "credentials_saved":
        return {
          label: "Credentials saved",
          className: "bg-amber-100 text-amber-800 border-amber-300",
          icon: RefreshCw,
          description: "Credentials are saved. Test connection to verify Safaricom authorization.",
        };
      case "error":
        return {
          label: "Connection error",
          className: "bg-rose-100 text-rose-800 border-rose-300",
          icon: AlertCircle,
          description: initialSettings.lastError || "Could not authenticate with Safaricom.",
        };
      default:
        return {
          label: "Not configured",
          className: "bg-slate-100 text-slate-700 border-slate-300",
          icon: Info,
          description: "Online customer payments are not yet enabled for this pharmacy.",
        };
    }
  };

  const badge = statusBadge();
  const BadgeIcon = badge.icon;

  return (
    <div className="space-y-6">
      {/* Current Connection Status Banner */}
      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold admin-text">M-Pesa Merchant Settlement</h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                >
                  <BadgeIcon className="h-3 w-3" />
                  {badge.label}
                </span>
                <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-mono uppercase text-slate-600 dark:text-slate-300">
                  {initialSettings.environment}
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm admin-muted">{badge.description}</p>
              {initialSettings.shortcode && (
                <p className="mt-1 text-xs font-mono admin-soft">
                  Shortcode: {initialSettings.shortcode} ({initialSettings.shortcodeType === "till" ? "Buy Goods / Till" : "PayBill"})
                </p>
              )}
            </div>
          </div>

          {canManage && initialSettings.credentialsConfigured && (
            <div className="flex items-center gap-2 shrink-0">
              {/* Test Connection Form */}
              <form action={testAction}>
                <input type="hidden" name="pharmacyId" value={pharmacyId} />
                <button
                  type="submit"
                  disabled={testPending}
                  className="btn-admin min-h-10 text-xs px-3.5 flex items-center gap-1.5"
                >
                  {testPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  <span>Test connection</span>
                </button>
              </form>

              {/* Disconnect Form */}
              <form action={disconnectAction}>
                <input type="hidden" name="pharmacyId" value={pharmacyId} />
                <button
                  type="submit"
                  disabled={disconnectPending}
                  onClick={(e) => {
                    if (!confirm("Are you sure you want to disconnect online payments for this pharmacy?")) {
                      e.preventDefault();
                    }
                  }}
                  className="btn-admin min-h-10 text-xs px-3.5 border-rose-200 text-rose-700 hover:bg-rose-50 flex items-center gap-1.5"
                >
                  {disconnectPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Unplug className="h-3.5 w-3.5" />
                  )}
                  <span>Disconnect</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Feedback alerts */}
        {testState.error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Test Connection Failed</p>
              <p className="mt-0.5">{testState.error}</p>
            </div>
          </div>
        )}

        {testState.success && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Test Connection Succeeded</p>
              <p className="mt-0.5">{testState.success}</p>
            </div>
          </div>
        )}

        {disconnectState.success && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {disconnectState.success}
          </div>
        )}
      </div>

      {/* Main Configuration Form */}
      {canManage ? (
        <form action={saveAction} className="space-y-6">
          <input type="hidden" name="pharmacyId" value={pharmacyId} />

          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 sm:p-6 space-y-5">
            <div>
              <h3 className="text-base font-semibold admin-text">M-Pesa Account Details</h3>
              <p className="mt-1 text-xs sm:text-sm admin-muted">
                Connect your pharmacy&apos;s M-Pesa merchant account so customer medicine and service payments settle directly to your business.
              </p>
            </div>

            {/* Environment Toggle */}
            <div>
              <label className="text-xs font-semibold admin-muted block mb-1.5">Environment</label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <label
                  className={`flex items-center gap-2 rounded-xl border p-3 cursor-pointer text-xs font-medium transition ${
                    environment === "sandbox"
                      ? "border-[var(--admin-accent)] bg-[var(--admin-inset)]"
                      : "border-[var(--admin-border)] bg-transparent hover:bg-[var(--admin-inset)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="environment"
                    value="sandbox"
                    checked={environment === "sandbox"}
                    onChange={() => setEnvironment("sandbox")}
                    className="accent-[var(--admin-accent)]"
                  />
                  <div>
                    <p className="font-semibold admin-text">Sandbox / Testing</p>
                    <p className="text-[11px] admin-muted">Test with simulated Safaricom prompts</p>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-2 rounded-xl border p-3 cursor-pointer text-xs font-medium transition ${
                    environment === "production"
                      ? "border-[var(--admin-accent)] bg-[var(--admin-inset)]"
                      : "border-[var(--admin-border)] bg-transparent hover:bg-[var(--admin-inset)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="environment"
                    value="production"
                    checked={environment === "production"}
                    onChange={() => setEnvironment("production")}
                    className="accent-[var(--admin-accent)]"
                  />
                  <div>
                    <p className="font-semibold admin-text">Production / Live</p>
                    <p className="text-[11px] admin-muted">Collect real customer payments</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Shortcode Type */}
            <div>
              <label className="text-xs font-semibold admin-muted block mb-1.5">M-Pesa Shortcode Type</label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <label
                  className={`flex items-center gap-2 rounded-xl border p-3 cursor-pointer text-xs font-medium transition ${
                    shortcodeType === "paybill"
                      ? "border-[var(--admin-accent)] bg-[var(--admin-inset)]"
                      : "border-[var(--admin-border)] bg-transparent hover:bg-[var(--admin-inset)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="shortcodeType"
                    value="paybill"
                    checked={shortcodeType === "paybill"}
                    onChange={() => setShortcodeType("paybill")}
                    className="accent-[var(--admin-accent)]"
                  />
                  <div>
                    <p className="font-semibold admin-text">PayBill</p>
                    <p className="text-[11px] admin-muted">CustomerPayBillOnline</p>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-2 rounded-xl border p-3 cursor-pointer text-xs font-medium transition ${
                    shortcodeType === "till"
                      ? "border-[var(--admin-accent)] bg-[var(--admin-inset)]"
                      : "border-[var(--admin-border)] bg-transparent hover:bg-[var(--admin-inset)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="shortcodeType"
                    value="till"
                    checked={shortcodeType === "till"}
                    onChange={() => setShortcodeType("till")}
                    className="accent-[var(--admin-accent)]"
                  />
                  <div>
                    <p className="font-semibold admin-text">Till / Buy Goods</p>
                    <p className="text-[11px] admin-muted">CustomerBuyGoodsOnline</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Shortcode */}
            <div>
              <label className="grid gap-1.5 text-xs font-semibold admin-muted max-w-md">
                <span>{shortcodeType === "till" ? "Till Number / Store Shortcode" : "PayBill Business Number"}</span>
                <input
                  name="shortcode"
                  type="text"
                  inputMode="numeric"
                  value={shortcode}
                  onChange={(e) => setShortcode(e.target.value)}
                  placeholder={shortcodeType === "till" ? "e.g. 522123" : "e.g. 174379"}
                  className="input-admin w-full"
                  required
                />
              </label>
            </div>

            {/* Secret credentials */}
            <div className="pt-2 border-t border-[var(--admin-border)] space-y-4">
              <div>
                <h4 className="text-sm font-semibold admin-text">Safaricom Daraja API Credentials</h4>
                <p className="text-xs admin-muted mt-0.5">
                  Treatment: High-value secrets are encrypted with AES-256-GCM before storage and never returned to the browser.
                  Leave secret fields blank to keep currently saved credentials.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold admin-muted">
                  <div className="flex items-center justify-between">
                    <span>Consumer Key</span>
                    {initialSettings.hasConsumerKey && (
                      <span className="text-[10px] text-emerald-600 font-normal">Currently saved</span>
                    )}
                  </div>
                  <input
                    type="password"
                    autoComplete="new-password"
                    name="consumerKey"
                    placeholder={initialSettings.hasConsumerKey ? "Leave blank to keep saved key" : "Found in Daraja portal → My Apps"}
                    className="input-admin w-full"
                  />
                  <span className="text-[11px] admin-soft">Found in your Safaricom Daraja live app.</span>
                </label>

                <label className="grid gap-1.5 text-xs font-semibold admin-muted">
                  <div className="flex items-center justify-between">
                    <span>Consumer Secret</span>
                    {initialSettings.hasConsumerSecret && (
                      <span className="text-[10px] text-emerald-600 font-normal">Currently saved</span>
                    )}
                  </div>
                  <input
                    type="password"
                    autoComplete="new-password"
                    name="consumerSecret"
                    placeholder={initialSettings.hasConsumerSecret ? "Leave blank to keep saved secret" : "Found in Daraja portal → My Apps"}
                    className="input-admin w-full"
                  />
                  <span className="text-[11px] admin-soft">Found in your Safaricom Daraja live app.</span>
                </label>

                <label className="grid gap-1.5 text-xs font-semibold admin-muted sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span>Lipa na M-Pesa Online Passkey</span>
                    {initialSettings.hasPasskey && (
                      <span className="text-[10px] text-emerald-600 font-normal">Currently saved</span>
                    )}
                  </div>
                  <input
                    type="password"
                    autoComplete="new-password"
                    name="passkey"
                    placeholder={initialSettings.hasPasskey ? "Leave blank to keep saved passkey" : "Supplied during Safaricom go-live"}
                    className="input-admin w-full"
                  />
                  <span className="text-[11px] admin-soft">
                    Lipa na M-Pesa Online passkey issued for your shortcode during Safaricom go-live.
                  </span>
                </label>
              </div>
            </div>

            {/* Server-generated Callback URL */}
            <div className="pt-2 border-t border-[var(--admin-border)]">
              <label className="block text-xs font-semibold admin-muted mb-1.5">
                M-Pesa Webhook / Callback URL
              </label>
              <div className="flex items-center gap-2 max-w-xl">
                <input
                  type="text"
                  readOnly
                  value={initialSettings.callbackUrl}
                  className="input-admin w-full font-mono text-xs bg-[var(--admin-inset)] cursor-text"
                />
                <button
                  type="button"
                  onClick={copyCallbackUrl}
                  className="btn-admin min-h-10 px-3 shrink-0 flex items-center gap-1 text-xs"
                >
                  {copiedCallback ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCallback ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <p className="text-[11px] admin-soft mt-1">
                Generated automatically by Aether from platform domain. Configure this in your Daraja portal if requested.
              </p>
            </div>
          </div>

          {/* Save Status Banner */}
          {saveState.error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{saveState.error}</span>
            </div>
          )}

          {saveState.success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{saveState.success}</span>
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs admin-muted">
              <ShieldCheck className="h-4 w-4 text-[var(--admin-accent)] shrink-0" />
              <span>Changes apply immediately to online orders for this pharmacy.</span>
            </div>
            <button
              type="submit"
              disabled={savePending}
              className="btn-primary min-h-11 px-6 w-full sm:w-auto flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm"
            >
              {savePending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>Save payment settings</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 text-sm admin-muted">
          Only pharmacy owners and managers can view or edit payment credentials.
        </div>
      )}

      {/* Helpful Guidance Card */}
      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-5 space-y-3">
        <h4 className="text-sm font-semibold admin-text flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-[var(--admin-accent)]" />
          Where do I get my Daraja credentials?
        </h4>
        <div className="text-xs admin-muted space-y-2 leading-relaxed">
          <p>
            1. Log in to the <strong>Safaricom Daraja Portal</strong> (daraja.safaricom.co.ke).
          </p>
          <p>
            2. Go to <strong>My Apps</strong> and select your active production or sandbox application.
          </p>
          <p>
            3. Copy your <strong>Consumer Key</strong> and <strong>Consumer Secret</strong>.
          </p>
          <p>
            4. Your <strong>Lipa na M-Pesa Online Passkey</strong> was sent to your authorized contact email when your shortcode went live with Safaricom.
          </p>
          <p className="text-[11px] admin-soft pt-1">
            Note: Aether does not create shortcodes or settle funds on your behalf. Customer payments go directly from Safaricom to your pharmacy&apos;s own shortcode.
          </p>
        </div>
      </div>
    </div>
  );
}
