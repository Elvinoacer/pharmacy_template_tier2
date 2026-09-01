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
    return <p className="p-6 text-sm">Select a pharmacy first.</p>;
  }
  const row = await prismaUnscoped.pharmacyIntegration.findUnique({
    where: { pharmacyId: tenant.pharmacyId },
  });
  const membership = user.memberships.find((m) => m.pharmacyId === tenant.pharmacyId);
  const canManage = user.platformAdmin || membership?.role === "owner" || membership?.role === "manager";

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Integrations</h1>
      <p className="mt-2 text-sm text-slate-600">
        Tenant credentials for M-Pesa, SMS, WhatsApp and POS. Platform env is used only as an explicit fallback.
      </p>
      <dl className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm">
        <div className="flex justify-between"><dt>M-Pesa shortcode</dt><dd>{row?.darajaShortcode || "not set"}</dd></div>
        <div className="flex justify-between"><dt>Last M-Pesa success</dt><dd>{row?.darajaLastSuccessAt?.toISOString() || "—"}</dd></div>
        <div className="flex justify-between"><dt>SMS from</dt><dd>{row?.twilioSmsFrom || "platform fallback"}</dd></div>
        <div className="flex justify-between"><dt>WhatsApp number id</dt><dd>{row?.whatsappPhoneNumberId || "platform fallback"}</dd></div>
        <div className="flex justify-between"><dt>POS last sync</dt><dd>{row?.posLastSyncAt?.toISOString() || "—"}</dd></div>
        <div className="flex justify-between"><dt>Last POS error</dt><dd>{row?.posLastError || "—"}</dd></div>
      </dl>
      {canManage ? (
        <form action={saveTenantIntegrationsAction} className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <label className="grid gap-1 text-sm">
            Daraja shortcode
            <input name="darajaShortcode" defaultValue={row?.darajaShortcode ?? ""} className="h-10 rounded-lg border px-3" />
          </label>
          <label className="grid gap-1 text-sm">
            Daraja consumer key
            <input name="darajaConsumerKey" className="h-10 rounded-lg border px-3" />
          </label>
          <label className="grid gap-1 text-sm">
            Daraja consumer secret
            <input name="darajaConsumerSecret" className="h-10 rounded-lg border px-3" />
          </label>
          <label className="grid gap-1 text-sm">
            Daraja passkey
            <input name="darajaPasskey" className="h-10 rounded-lg border px-3" />
          </label>
          <label className="grid gap-1 text-sm">
            Email from override
            <input name="emailFromOverride" defaultValue={row?.emailFromOverride ?? ""} className="h-10 rounded-lg border px-3" />
          </label>
          <label className="grid gap-1 text-sm">
            Support email
            <input name="supportEmailOverride" defaultValue={row?.supportEmailOverride ?? ""} className="h-10 rounded-lg border px-3" />
          </label>
          <label className="grid gap-1 text-sm">
            Support phone
            <input name="supportPhoneOverride" defaultValue={row?.supportPhoneOverride ?? ""} className="h-10 rounded-lg border px-3" />
          </label>
          <button className="h-11 rounded-xl bg-teal-800 text-sm font-semibold text-white">Save credentials</button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Only owners and managers can change credentials.</p>
      )}
    </div>
  );
}
