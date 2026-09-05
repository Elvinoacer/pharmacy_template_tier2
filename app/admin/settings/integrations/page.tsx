import Link from "next/link";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { AdminSubmitButton } from "@/app/components/admin/AdminSubmitButton";
import { getSessionUser, requireStaff } from "@/app/lib/auth";
import { getTenant } from "@/app/lib/tenant";
import { prismaUnscoped } from "@/app/lib/db";
import { saveTenantIntegrationsAction } from "@/app/actions/tenant-admin";

export const metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const user = requireStaff(await getSessionUser());
  const tenant = await getTenant();
  if (!tenant.pharmacyId) {
    return <AdminShell user={user} title="Connected services"><Link href="/admin/select" className="btn-admin">Choose a pharmacy to manage its connections</Link></AdminShell>;
  }
  const row = await prismaUnscoped.pharmacyIntegration.findUnique({
    where: { pharmacyId: tenant.pharmacyId },
  });
  const membership = user.memberships.find((m) => m.pharmacyId === tenant.pharmacyId);
  const canManage = user.platformAdmin || membership?.role === "owner" || membership?.role === "manager";

  return (
    <AdminShell user={user} title="Connected services" subtitle="Manage payment and communication connections for this pharmacy.">
    <div className="max-w-3xl">
      <p className="mt-2 text-sm text-slate-600">
        Review connection status below. Owners and managers can update the payment and contact details.
      </p>
      <dl className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-[var(--admin-card)] p-5 text-sm">
        <div className="grid gap-1 sm:grid-cols-2 sm:gap-4 break-words"><dt>M-Pesa shortcode</dt><dd>{row?.darajaShortcode || "not set"}</dd></div>
        <div className="grid gap-1 sm:grid-cols-2 sm:gap-4 break-words"><dt>Last M-Pesa success</dt><dd>{row?.darajaLastSuccessAt?.toISOString() || "—"}</dd></div>
        <div className="grid gap-1 sm:grid-cols-2 sm:gap-4 break-words"><dt>SMS from</dt><dd>{row?.twilioSmsFrom || "platform fallback"}</dd></div>
        <div className="grid gap-1 sm:grid-cols-2 sm:gap-4 break-words"><dt>WhatsApp number id</dt><dd>{row?.whatsappPhoneNumberId || "platform fallback"}</dd></div>
        <div className="grid gap-1 sm:grid-cols-2 sm:gap-4 break-words"><dt>POS last sync</dt><dd>{row?.posLastSyncAt?.toISOString() || "—"}</dd></div>
        <div className="grid gap-1 sm:grid-cols-2 sm:gap-4 break-words"><dt>Last POS error</dt><dd>{row?.posLastError || "—"}</dd></div>
      </dl>
      {canManage ? (
        <form action={saveTenantIntegrationsAction} className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-[var(--admin-card)] p-5">
          <label className="grid gap-1 text-sm">
            Daraja shortcode
            <input name="darajaShortcode" defaultValue={row?.darajaShortcode ?? ""} className="input-admin" />
          </label>
          <label className="grid gap-1 text-sm">
            Daraja consumer key
            <input type="password" autoComplete="new-password" name="darajaConsumerKey" className="input-admin" />
          </label>
          <label className="grid gap-1 text-sm">
            Daraja consumer secret
            <input type="password" autoComplete="new-password" name="darajaConsumerSecret" className="input-admin" />
          </label>
          <label className="grid gap-1 text-sm">
            Daraja passkey
            <input type="password" autoComplete="new-password" name="darajaPasskey" className="input-admin" />
          </label>
          <label className="grid gap-1 text-sm">
            Email from override
            <input name="emailFromOverride" defaultValue={row?.emailFromOverride ?? ""} className="input-admin" />
          </label>
          <label className="grid gap-1 text-sm">
            Support email
            <input name="supportEmailOverride" defaultValue={row?.supportEmailOverride ?? ""} className="input-admin" />
          </label>
          <label className="grid gap-1 text-sm">
            Support phone
            <input name="supportPhoneOverride" defaultValue={row?.supportPhoneOverride ?? ""} className="input-admin" />
          </label>
          <AdminSubmitButton>Save connection details</AdminSubmitButton>
        </form>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Only owners and managers can change credentials.</p>
      )}
    </div>
    </AdminShell>
  );
}
