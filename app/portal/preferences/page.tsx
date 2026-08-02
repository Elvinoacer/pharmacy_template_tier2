import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { updatePreferencesAction } from "@/app/actions/portal";
import { PortalShell, Panel } from "@/app/components/portal/PortalShell";
import PreferencesForm from "@/app/components/portal/PreferencesForm";
import { PushEnablePanel } from "@/app/components/PushNotificationCenter";
import { Settings, Bell, MessageSquare, Heart, Cake, Smartphone } from "lucide-react";

export const metadata = { title: "Preferences" };

export default async function PortalPreferencesPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");

  const prefs = await prisma.customerPreference.findUnique({
    where: { customerId: user.customerId },
  });

  return (
    <PortalShell
      user={user}
      title="Communication preferences"
      subtitle="Choose how and when you'd like to hear from us."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="space-y-3 lg:col-span-1">
          <Panel>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a]">
                <Settings className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#0c1a14]">Stay in control</p>
                <p className="mt-0.5 text-xs text-[#5a6b62]">
                  You can change these settings any time. We will never contact you on a channel you have turned off.
                </p>
              </div>
            </div>
          </Panel>
          <Panel>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <Smartphone className="mt-0.5 h-4 w-4 text-[#0d6e5a]" />
                <div>
                  <p className="font-medium text-[#0c1a14]">Browser push</p>
                  <p className="text-xs text-[#5a6b62]">Register this device for alerts</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Bell className="mt-0.5 h-4 w-4 text-[#0d6e5a]" />
                <div>
                  <p className="font-medium text-[#0c1a14]">Channel toggles</p>
                  <p className="text-xs text-[#5a6b62]">Email, SMS, WhatsApp</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MessageSquare className="mt-0.5 h-4 w-4 text-[#0d6e5a]" />
                <div>
                  <p className="font-medium text-[#0c1a14]">Marketing consent</p>
                  <p className="text-xs text-[#5a6b62]">Promotional content only</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Heart className="mt-0.5 h-4 w-4 text-[#0d6e5a]" />
                <div>
                  <p className="font-medium text-[#0c1a14]">Refill reminders</p>
                  <p className="text-xs text-[#5a6b62]">Pickup & due-date alerts</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Cake className="mt-0.5 h-4 w-4 text-[#0d6e5a]" />
                <div>
                  <p className="font-medium text-[#0c1a14]">Birthday messages</p>
                  <p className="text-xs text-[#5a6b62]">Annual personalised greeting</p>
                </div>
              </div>
            </div>
          </Panel>
        </aside>

        <div className="space-y-6 lg:col-span-2">
          <Panel
            title="Device push notifications"
            description="This is separate from email/SMS — it registers this browser for Firebase Cloud Messaging."
          >
            <PushEnablePanel audience="portal" />
          </Panel>

          <Panel
            title="Channels & consent"
            description="Marketing messages require explicit consent. Refill and pickup reminders only send when reminder consent is enabled."
          >
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
        </div>
      </div>
    </PortalShell>
  );
}
