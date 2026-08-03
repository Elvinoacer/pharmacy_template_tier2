import { redirect } from "next/navigation";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { Panel } from "@/app/components/portal/PortalWidgets";
import FeedbackForm from "@/app/components/portal/FeedbackForm";
import { formatDateTime } from "@/app/lib/time";
import { Star, Lightbulb, AlertTriangle, Smile, MessageSquare, CheckCircle2 } from "lucide-react";

export const metadata = { title: "Feedback" };

export default async function PortalFeedbackPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();

  const past = await prisma.feedback.findMany({
    where: { customerId: user.customerId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

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
                  A manager will personally review your feedback and may respond here.
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

        <div className="space-y-6 lg:col-span-2">
          <Panel
            title="How are we doing?"
            description="Your feedback goes straight to our pharmacy managers"
          >
            <FeedbackForm />
          </Panel>

          <Panel
            title="Your past feedback"
            description={`${past.length} submission${past.length === 1 ? "" : "s"}`}
          >
            {past.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#5a6b62]">
                You haven&apos;t submitted feedback yet. Your history and any staff replies will appear here.
              </p>
            ) : (
              <ul className="space-y-3">
                {past.map((f) => (
                  <li
                    key={f.id}
                    className="rounded-xl border border-[#e3ebe6] bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-[#0d6e5a]" />
                      <p className="font-semibold text-[#0c1a14]">{f.title || f.type}</p>
                      <span className="rounded-full bg-[#f4f7f4] px-2 py-0.5 text-[10px] capitalize text-[#5a6b62]">
                        {f.status}
                      </span>
                      {f.rating != null && (
                        <span className="text-xs text-amber-600">{f.rating}/5</span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-[#0c1a14]">{f.body}</p>
                    <p className="mt-1 text-[10px] text-[#8a9a92]">{formatDateTime(f.createdAt)}</p>
                    {f.staffResponse && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            Pharmacy response
                            {f.respondedAt ? ` · ${formatDateTime(f.respondedAt)}` : ""}
                          </p>
                          <p className="mt-0.5 text-[#0c1a14]">{f.staffResponse}</p>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </PortalShell>
  );
}
