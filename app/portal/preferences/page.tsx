import { redirect } from "next/navigation";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { updatePreferencesAction } from "@/app/actions/portal";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { Panel } from "@/app/components/portal/PortalWidgets";
import PreferencesForm from "@/app/components/portal/PreferencesForm";
import { PushEnablePanel } from "@/app/components/PushNotificationCenter";
import { Settings, Bell, MessageSquare, Heart, Cake, Smartphone } from "lucide-react";

export const metadata = { title: "Preferences" };

export default async function PortalPreferencesPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();

  const prefs = await prisma.customerPreference.findUnique({
    where: { customerId: user.customerId },
  });

  return (
    <PortalShell
      user={user}
      title="Communication preferences"
      subtitle="Choose how and when you'd like to hear from us."
    >
      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-3">
        <aside className="min-w-0 space-y-3 lg:col-span-1">
          <Panel>
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a] dark:bg-teal-500/15 dark:text-teal-300">
                <Settings className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-[#0c1a14] dark:text-slate-100">Stay in control</p>
                <p className="mt-0.5 break-words text-xs leading-relaxed text-[#5a6b62] dark:text-slate-400">
                  You can change these settings any time. We will never contact you on a channel you have turned off.
                </p>
              </div>
            </div>
          </Panel>
          <Panel>
            <div className="space-y-3 text-sm">
              <PreferenceSummary icon={Smartphone} title="Browser push" description="Register this device for alerts" />
              <PreferenceSummary icon={Bell} title="Channel toggles" description="Email, SMS, WhatsApp" />
              <PreferenceSummary icon={MessageSquare} title="Marketing consent" description="Promotional content only" />
              <PreferenceSummary icon={Heart} title="Refill reminders" description="Pickup & due-date alerts" />
              <PreferenceSummary icon={Cake} title="Birthday messages" description="Annual personalised greeting" />
            </div>
          </Panel>
        </aside>

        <div className="min-w-0 space-y-4 sm:space-y-6 lg:col-span-2">
          <Panel
            title="Device push notifications"
            description="This is separate from email/SMS — it registers this browser for Firebase Cloud Messaging."
          >
            <div className="min-w-0 overflow-hidden">
              <PushEnablePanel audience="portal" />
            </div>
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

function PreferenceSummary({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#0d6e5a] dark:text-teal-300" />
      <div className="min-w-0">
        <p className="break-words font-medium text-[#0c1a14] dark:text-slate-100">{title}</p>
        <p className="break-words text-xs leading-relaxed text-[#5a6b62] dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}
