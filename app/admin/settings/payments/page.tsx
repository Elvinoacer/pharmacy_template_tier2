import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { getSessionUser, requireStaff } from "@/app/lib/auth";
import { getTenant } from "@/app/lib/tenant";
import { getPharmacyPaymentSettings } from "@/app/lib/platform/integrations";
import { PaymentSettingsClient } from "./PaymentSettingsClient";
import { ArrowLeft, Banknote, ShieldCheck } from "lucide-react";

export const metadata = { title: "Payment Settings | Admin" };
export const dynamic = "force-dynamic";

export default async function PharmacyPaymentSettingsPage() {
  const user = requireStaff(await getSessionUser());
  const tenant = await getTenant();

  if (!tenant.pharmacyId) {
    return (
      <AdminShell user={user} title="Payment settings">
        <Link href="/admin/select" className="btn-admin min-h-11 justify-center">
          Choose a pharmacy to manage its payment connections
        </Link>
      </AdminShell>
    );
  }

  const membership = user.memberships.find((m) => m.pharmacyId === tenant.pharmacyId);
  const canManage =
    user.platformAdmin || membership?.role === "owner" || membership?.role === "manager";

  const settings = await getPharmacyPaymentSettings(tenant.pharmacyId);

  return (
    <AdminShell
      user={user}
      title="Online payment collection"
      subtitle="Connect your pharmacy's M-Pesa account so customer payments settle directly to your business."
    >
      <div className="max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <Link
            href="/admin/settings/integrations"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--admin-soft)] hover:text-[var(--admin-text)] transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Connected Services</span>
          </Link>
        </div>

        <PaymentSettingsClient
          pharmacyId={tenant.pharmacyId}
          initialSettings={settings}
          canManage={canManage}
        />
      </div>
    </AdminShell>
  );
}
