import { redirect } from "next/navigation";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { getSessionUser } from "@/app/lib/auth";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { Panel } from "@/app/components/portal/PortalWidgets";
import FeedbackForm from "@/app/components/portal/FeedbackForm";
import { Star, Lightbulb, AlertTriangle, Smile } from "lucide-react";

export const metadata = { title: "Feedback" };

export default async function PortalFeedbackPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();

  return (
    <PortalShell
      user={user}
      title="Share feedback"
      subtitle="Reviews, suggestions, and complaints help us improve."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="space-y-3 lg:col-span-1">
          <Panel>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fbf4dd] text-[#a08418]">
                <Star className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#0c1a14]">We read every response</p>
                <p className="mt-0.5 text-xs text-[#5a6b62]">
                  A manager will personally review your feedback and may respond via the CRM.
                </p>
              </div>
            </div>
          </Panel>
          <Panel title="Types of feedback">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <Star className="mt-0.5 h-4 w-4 text-amber-500" />
                <div>
                  <p className="font-medium text-[#0c1a14]">Review</p>
                  <p className="text-xs text-[#5a6b62]">Rate your experience with us</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Lightbulb className="mt-0.5 h-4 w-4 text-blue-500" />
                <div>
                  <p className="font-medium text-[#0c1a14]">Suggestion</p>
                  <p className="text-xs text-[#5a6b62]">Ideas to improve our service</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-500" />
                <div>
                  <p className="font-medium text-[#0c1a14]">Complaint</p>
                  <p className="text-xs text-[#5a6b62]">Tell us what went wrong</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Smile className="mt-0.5 h-4 w-4 text-emerald-500" />
                <div>
                  <p className="font-medium text-[#0c1a14]">Satisfaction</p>
                  <p className="text-xs text-[#5a6b62]">Quick pulse check on your visit</p>
                </div>
              </li>
            </ul>
          </Panel>
        </aside>

        <div className="lg:col-span-2">
          <Panel
            title="How are we doing?"
            description="Your feedback goes straight to our pharmacy managers"
          >
            <FeedbackForm />
          </Panel>
        </div>
      </div>
    </PortalShell>
  );
}
