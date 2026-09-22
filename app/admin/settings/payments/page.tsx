import Link from "next/link";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { getSessionUser, requireStaff } from "@/app/lib/auth";
import { getTenant } from "@/app/lib/tenant";
import { getPharmacyPaymentSettings } from "@/app/lib/platform/integrations";
import { PaymentSettingsClient } from "./PaymentSettingsClient";
import { ArrowLeft } from "lucide-react";

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
      <div className="payment-settings-ux mx-auto w-full max-w-4xl space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/admin/settings/integrations"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--admin-soft)] transition hover:text-[var(--admin-text)]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Connected Services</span>
          </Link>
        </div>

        <PaymentSettingsClient
          pharmacyId={tenant.pharmacyId}
          initialSettings={settings}
          canManage={canManage}
        />

        <style>{`
          .payment-settings-ux {
            min-width: 0;
            overflow-wrap: anywhere;
          }

          .payment-settings-ux > div,
          .payment-settings-ux form {
            min-width: 0;
          }

          .payment-settings-ux :is(button, a) {
            min-height: 44px;
            font-size: 14px;
          }

          .payment-settings-ux :is(input:not([type="hidden"]), textarea, select) {
            max-width: 100%;
            min-width: 0;
            min-height: 44px;
            font-size: 16px;
          }

          .payment-settings-ux input[type="radio"] {
            width: 44px;
            height: 44px;
            flex: 0 0 44px;
          }

          .payment-settings-ux label {
            font-size: 14px;
          }

          .payment-settings-ux p {
            font-size: 16px;
            line-height: 1.5;
          }

          .payment-settings-ux span[class*="text-[10px]"],
          .payment-settings-ux span[class*="text-[11px]"],
          .payment-settings-ux span[class*="text-xs"] {
            font-size: 14px;
          }

          .payment-settings-ux .grid.grid-cols-2 {
            grid-template-columns: minmax(0, 1fr);
          }

          .payment-settings-ux div.flex.items-center.gap-2.shrink-0 {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
          }

          .payment-settings-ux div.flex.items-center.gap-2.shrink-0 > form,
          .payment-settings-ux div.flex.items-center.gap-2.shrink-0 > form > button {
            width: 100%;
          }

          .payment-settings-ux .max-w-xl.flex.items-center.gap-2 {
            flex-direction: column;
            align-items: stretch;
          }

          .payment-settings-ux .max-w-xl.flex.items-center.gap-2 > :is(input, button) {
            width: 100%;
          }

          @media (min-width: 640px) {
            .payment-settings-ux :is(input:not([type="hidden"]), textarea, select),
            .payment-settings-ux p {
              font-size: 14px;
            }

            .payment-settings-ux .grid.grid-cols-2 {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .payment-settings-ux div.flex.items-center.gap-2.shrink-0 {
              width: auto;
              flex-direction: row;
              align-items: center;
            }

            .payment-settings-ux div.flex.items-center.gap-2.shrink-0 > form,
            .payment-settings-ux div.flex.items-center.gap-2.shrink-0 > form > button {
              width: auto;
            }

            .payment-settings-ux .max-w-xl.flex.items-center.gap-2 {
              flex-direction: row;
              align-items: center;
            }

            .payment-settings-ux .max-w-xl.flex.items-center.gap-2 > input {
              width: 100%;
            }

            .payment-settings-ux .max-w-xl.flex.items-center.gap-2 > button {
              width: auto;
            }
          }
        `}</style>
      </div>
    </AdminShell>
  );
}
