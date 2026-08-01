import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import PortalShell, { Panel } from "@/app/components/portal/PortalShell";
import FeedbackForm from "@/app/components/portal/FeedbackForm";

export const metadata = { title: "Feedback" };

export default async function PortalFeedbackPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");

  return (
    <PortalShell user={user} title="Share feedback">
      <Panel title="How are we doing?">
        <p className="mb-4 text-sm text-[#5a6b62]">
          Reviews, suggestions, and complaints help us improve. Managers can respond from the CRM.
        </p>
        <FeedbackForm />
      </Panel>
    </PortalShell>
  );
}
