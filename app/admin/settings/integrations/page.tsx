import Link from "next/link";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { AdminCard, AdminPanel } from "@/app/components/admin/AdminUI";
import { AdminSubmitButton } from "@/app/components/admin/AdminSubmitButton";
import { getSessionUser, requireStaff } from "@/app/lib/auth";
import { getTenant } from "@/app/lib/tenant";
import { prismaUnscoped } from "@/app/lib/db";
import { saveTenantIntegrationsAction } from "@/app/actions/tenant-admin";
import { getPharmacyPaymentSettings } from "@/app/lib/platform/integrations";
import { Banknote, MessageCircle, RefreshCw, ShieldCheck, ArrowRight } from "lucide-react";

export const metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const user = requireStaff(await getSessionUser());
  const tenant = await getTenant();
  if (!tenant.pharmacyId) {
    return <AdminShell user={user} title="Connected services"><Link href="/admin/select" className="btn-admin min-h-11 justify-center">Choose a pharmacy to manage its connections</Link></AdminShell>;
  }

  const row = await prismaUnscoped.pharmacyIntegration.findUnique({ where: { pharmacyId: tenant.pharmacyId } });
  const paymentSettings = await getPharmacyPaymentSettings(tenant.pharmacyId);
  const membership = user.memberships.find((m) => m.pharmacyId === tenant.pharmacyId);
  const canManage = user.platformAdmin || membership?.role === "owner" || membership?.role === "manager";
  const mpesaReady = paymentSettings.connected;
  const messagingReady = Boolean(row?.twilioSmsFrom || row?.whatsappPhoneNumberId);
  const posReady = Boolean(row?.posLastSyncAt) && !row?.posLastError;

  const mpesaCardLabel =
    paymentSettings.status === "live_confirmed"
      ? "Live confirmed"
      : paymentSettings.status === "auth_verified"
        ? "Auth verified"
        : paymentSettings.connected
          ? "Credentials saved"
          : paymentSettings.status === "error"
            ? "Error"
            : "Needs setup";

  const mpesaAccent =
    paymentSettings.status === "live_confirmed"
      ? "accent"
      : paymentSettings.status === "auth_verified" || paymentSettings.connected
        ? "info"
        : paymentSettings.status === "error"
          ? "danger"
          : "danger";

  return (
    <AdminShell user={user} title="Connected services" subtitle="Keep payment, messaging, and operational integrations healthy from one focused workspace.">
      <div className="integrations-ux max-w-5xl space-y-4 sm:space-y-6">
        <section aria-label="Integration health" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          <Link href="/admin/settings/payments" className="block focus:outline-hidden">
            <AdminCard
              label="M-Pesa"
              value={mpesaCardLabel}
              hint={paymentSettings.lastSuccessfulPaymentAt ? "Live settlement confirmed" : paymentSettings.lastVerifiedAt ? "OAuth authenticated" : "Manage M-Pesa setup →"}
              icon={Banknote}
              accent={mpesaAccent}
            />
          </Link>
          <AdminCard label="Messaging" value={messagingReady ? "Configured" : "Fallback"} hint="SMS / WhatsApp routing" icon={MessageCircle} accent={messagingReady ? "info" : "neutral"} />
          <div className="col-span-2 sm:col-span-1"><AdminCard label="POS sync" value={posReady ? "Healthy" : row?.posLastError ? "Attention" : "Not synced"} hint={row?.posLastSyncAt ? "Sync history available" : "No sync recorded"} icon={RefreshCw} accent={posReady ? "accent" : row?.posLastError ? "danger" : "neutral"} /></div>
        </section>

        {/* Dedicated payment settings CTA */}
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40">
              <Banknote className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold admin-text">Customer Payment Collection</p>
              <p className="text-xs admin-muted mt-0.5">
                Configure PayBill / Till, environment, credentials encryption, and test connection with Safaricom.
              </p>
            </div>
          </div>
          <Link href="/admin/settings/payments" className="btn-primary min-h-10 text-xs px-4 shrink-0 flex items-center justify-center gap-1.5 font-semibold">
            <span>Manage M-Pesa setup</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <AdminPanel title="Connection status" description="Operational identifiers only. Secrets are never shown back after saving." className="!p-4 sm:!p-6">
          <dl className="integration-status-grid grid gap-2.5 text-sm sm:grid-cols-2">
            {[
              ["M-Pesa shortcode", paymentSettings.shortcode ? `${paymentSettings.shortcode} (${paymentSettings.shortcodeType.toUpperCase()}, ${paymentSettings.environment})` : "Not set"],
              ["M-Pesa status", mpesaCardLabel],
              ["Last M-Pesa success", paymentSettings.lastSuccessfulPaymentAt || "No success yet"],
              ["SMS sender", row?.twilioSmsFrom || "Platform fallback"],
              ["WhatsApp number ID", row?.whatsappPhoneNumberId || "Platform fallback"],
              ["POS last sync", row?.posLastSyncAt?.toISOString() || "Not synced"],
              ["Last POS error", row?.posLastError || "No recorded error"],
            ].map(([label, value]) => <div key={label} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3.5 py-3"><dt className="text-[11px] font-semibold uppercase tracking-[0.12em] admin-soft">{label}</dt><dd className="mt-1 break-words text-sm font-medium admin-text">{value}</dd></div>)}
          </dl>
        </AdminPanel>

        {canManage ? (
          <form action={saveTenantIntegrationsAction} className="space-y-4 sm:space-y-5">
            <AdminPanel title="M-Pesa / Daraja" description="Configure checkout credentials. Leave secret fields blank unless you intend to rotate them." className="!p-4 sm:!p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold admin-muted">Daraja shortcode<input name="darajaShortcode" defaultValue={row?.darajaShortcode ?? ""} className="input-admin w-full" inputMode="numeric" /></label>
                <label className="grid gap-1.5 text-xs font-semibold admin-muted">Daraja consumer key<input type="password" autoComplete="new-password" name="darajaConsumerKey" className="input-admin w-full" /></label>
                <label className="grid gap-1.5 text-xs font-semibold admin-muted">Daraja consumer secret<input type="password" autoComplete="new-password" name="darajaConsumerSecret" className="input-admin w-full" /></label>
                <label className="grid gap-1.5 text-xs font-semibold admin-muted">Daraja passkey<input type="password" autoComplete="new-password" name="darajaPasskey" className="input-admin w-full" /></label>
              </div>
            </AdminPanel>
            <AdminPanel title="Patient communication" description="Override sender and support details only when this pharmacy needs pharmacy-specific routing." className="!p-4 sm:!p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold admin-muted sm:col-span-2">Email from override<input name="emailFromOverride" defaultValue={row?.emailFromOverride ?? ""} className="input-admin w-full" /></label>
                <label className="grid gap-1.5 text-xs font-semibold admin-muted">Support email<input name="supportEmailOverride" type="email" defaultValue={row?.supportEmailOverride ?? ""} className="input-admin w-full" autoComplete="email" /></label>
                <label className="grid gap-1.5 text-xs font-semibold admin-muted">Support phone<input name="supportPhoneOverride" defaultValue={row?.supportPhoneOverride ?? ""} className="input-admin w-full" autoComplete="tel" /></label>
              </div>
            </AdminPanel>
            <div className="save-dock flex flex-col gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="flex min-w-0 items-start gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 admin-accent-text" /><p className="text-xs leading-5 admin-muted">Changes apply to the selected pharmacy. Test payment and messaging flows after rotating credentials.</p></div>
              <div className="shrink-0"><AdminSubmitButton>Save connection details</AdminSubmitButton></div>
            </div>
          </form>
        ) : <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 text-sm admin-muted">Only owners and managers can change integration credentials. You can still review connection health above.</div>}

        <style>{`
          .integrations-ux input { min-height: 44px; }
          .integrations-ux .save-dock button { min-height: 44px; }
          @media (max-width: 639px) {
            .integrations-ux .save-dock button, .integrations-ux .save-dock > div:last-child { width: 100%; }
            .integrations-ux .save-dock button { justify-content: center; }
            .integrations-ux .integration-status-grid dd { overflow-wrap: anywhere; }
          }
        `}</style>
      </div>
    </AdminShell>
  );
}
