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
      <HowDoYouFeelClient mode="portal" />
    </PortalShell>
  );
}
