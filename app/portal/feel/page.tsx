import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { PortalShell } from "@/app/components/portal/PortalShell";
import HowDoYouFeelClient from "@/app/components/feel/HowDoYouFeelClient";

export const metadata = { title: "How do you feel?" };

export default async function PortalFeelPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/portal/feel");

  return (
    <PortalShell
      user={user}
      title="How do you feel?"
      subtitle="Guided check-ins saved to your account — escalate anytime for pharmacist feedback."
    >
      <div className="min-w-0 max-w-full [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_button]:min-h-11 [&_button]:min-w-11 [&_button]:text-sm [&_button_span]:text-sm [&_p]:text-base [&_textarea]:text-base">
        <HowDoYouFeelClient mode="portal" />
      </div>
    </PortalShell>
  );
}
