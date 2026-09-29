import { redirect } from "next/navigation";
import { withPlatformBypass } from "@/app/lib/tenant-context";
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

  return withPlatformBypass(async () => {
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
      <div className="mx-auto grid w-full max-w-[1280px] min-w-0 gap-4 sm:gap-6 md:grid-cols-3 [&_.card-premium>div:first-child>div>p]:text-sm">
        <aside className="min-w-0 space-y-4 md:col-span-1">
          <Panel>
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                <Star className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="break-words text-base font-semibold text-[var(--foreground)]">We read every response</p>
                <p className="mt-1 break-words text-sm leading-relaxed text-[var(--muted)]">
                  A manager will personally review your feedback and may respond here.
                </p>
              </div>
            </div>
          </Panel>
          <Panel title="Types of feedback">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Star className="mt-1 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="font-medium text-[var(--foreground)]">Review</p>
                  <p className="text-sm leading-relaxed text-[var(--muted)]">Rate your experience with us</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Lightbulb className="mt-1 h-4 w-4 shrink-0 text-blue-500" />
                <div>
                  <p className="font-medium text-[var(--foreground)]">Suggestion</p>
                  <p className="text-sm leading-relaxed text-[var(--muted)]">Ideas to improve our service</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-rose-500" />
                <div>
                  <p className="font-medium text-[var(--foreground)]">Complaint</p>
                  <p className="text-sm leading-relaxed text-[var(--muted)]">Tell us what went wrong</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Smile className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                <div>
                  <p className="font-medium text-[var(--foreground)]">Satisfaction</p>
                  <p className="text-sm leading-relaxed text-[var(--muted)]">Quick pulse check on your visit</p>
                </div>
              </li>
            </ul>
          </Panel>
        </aside>

        <div className="min-w-0 space-y-4 sm:space-y-6 md:col-span-2">
          <Panel
            title="How are we doing?"
            description="Your feedback goes straight to our pharmacy managers"
          >
            <div className="[&_button]:min-h-11 [&_button]:min-w-11 [&_button]:text-sm [&_input]:min-h-11 [&_input]:text-base [&_textarea]:text-base [&_.label-premium]:text-sm">
              <FeedbackForm />
            </div>
          </Panel>

          <Panel
            title="Your past feedback"
            description={`${past.length} submission${past.length === 1 ? "" : "s"}`}
          >
            {past.length === 0 ? (
              <p className="py-6 text-center text-sm leading-relaxed text-[var(--muted)]">
                You haven&apos;t submitted feedback yet. Your history and any staff replies will appear here.
              </p>
            ) : (
              <ul className="space-y-3">
                {past.map((f) => (
                  <li
                    key={f.id}
                    className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--card)] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <MessageSquare className="h-4 w-4 shrink-0 text-[var(--brand-deep)]" />
                      <p className="min-w-0 break-words font-semibold text-[var(--foreground)]">{f.title || f.type}</p>
                      <span className="rounded-full bg-[var(--card-elev)] px-3 py-1 text-sm font-medium capitalize text-[var(--muted)]">
                        {f.status}
                      </span>
                      {f.rating != null && (
                        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">{f.rating}/5</span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-base leading-relaxed text-[var(--foreground)]">{f.body}</p>
                    <p className="mt-1 text-sm text-[var(--muted-2)]">{formatDateTime(f.createdAt)}</p>
                    {f.staffResponse && (
                      <div className="mt-3 flex min-w-0 items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                            Pharmacy response
                            {f.respondedAt ? ` · ${formatDateTime(f.respondedAt)}` : ""}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-base leading-relaxed text-[var(--foreground)]">{f.staffResponse}</p>
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
  });
}
