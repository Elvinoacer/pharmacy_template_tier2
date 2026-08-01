import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { updatePreferencesAction } from "@/app/actions/portal";
import PortalShell, { Panel } from "@/app/components/portal/PortalShell";
import PreferencesForm from "@/app/components/portal/PreferencesForm";

export const metadata = { title: "Preferences" };

export default async function PortalPreferencesPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");

  const prefs = await prisma.customerPreference.findUnique({
    where: { customerId: user.customerId },
  });

  return (
    <PortalShell user={user} title="Communication preferences">
      <Panel title="Channels & consent">
        <p className="mb-4 text-sm text-[#5a6b62]">
          Marketing messages require explicit consent. Refill and pickup reminders only send when
          reminder consent is enabled.
        </p>
        <PreferencesForm
          action={updatePreferencesAction}
          prefs={{
            emailEnabled: prefs?.emailEnabled ?? true,
            smsEnabled: prefs?.smsEnabled ?? true,
            whatsappEnabled: prefs?.whatsappEnabled ?? true,
            marketingConsent: prefs?.marketingConsent ?? false,
            reminderConsent: prefs?.reminderConsent ?? true,
            birthdayMessages: prefs?.birthdayMessages ?? true,
          }}
        />
      </Panel>
    </PortalShell>
  );
}
