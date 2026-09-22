import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/app/lib/auth";
import { requireMedicationWriteContext } from "@/app/lib/services/medication-access";
import { isFeatureEnabled } from "@/app/lib/platform/entitlements";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { ArrowLeft, Camera, ClipboardCheck, Sparkles } from "lucide-react";
import { AiImportFlow } from "./AiImportFlow";

export const metadata = { title: "AI-Assisted Import — Medication" };

export default async function AiImportPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  let pharmacyId: string;
  try {
    pharmacyId = await requireMedicationWriteContext(user);
  } catch {
    redirect("/admin/medications");
  }

  const premium =
    user.platformAdmin ||
    await isFeatureEnabled(pharmacyId, "ai_import");
  if (!premium) {
    return (
      <AdminShell user={user} title="Import with AI assistance" subtitle="Premium unlocks AI-assisted medicine imports.">
        <section className="mx-auto max-w-xl space-y-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5">
          <h2 className="text-lg font-semibold">AI-assisted import is part of Premium</h2>
          <p className="text-base leading-6 admin-muted">
            The free plan includes manual entry and the shared medicine library, with up to 5 public listings. Premium is KES 500/month and adds AI-assisted imports, more listings, advanced analytics and POS synchronization.
          </p>
          <Link href="/admin/billing" className="btn-primary inline-flex min-h-11 items-center justify-center px-4 text-sm">View Premium</Link>
        </section>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      user={user}
      title="Import with AI assistance"
      subtitle="Extract medicine details with your preferred AI tool, review the structured data, then save it safely."
    >
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        <Link
          href="/admin/medications/add"
          className="group inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 text-sm font-medium admin-muted transition hover:text-[var(--admin-text)] sm:bg-transparent sm:px-0"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back to acquisition methods
        </Link>

        <section className="overflow-hidden rounded-2xl border border-violet-500/20 bg-violet-500/[0.06]">
          <div className="grid gap-3 p-4 sm:grid-cols-[auto_1fr] sm:items-start sm:p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">A guided three-step workflow</p>
              <p className="mt-1 text-base leading-6 text-violet-800/75 dark:text-violet-200/75 sm:text-sm sm:leading-5">
                Your photos stay with the AI tool you choose. This workspace only receives the JSON you paste back for validation and review.
              </p>
            </div>
          </div>
          <div className="grid border-t border-violet-500/15 sm:grid-cols-3">
            {[
              [Camera, "1. Capture", "Photograph the pack and leaflet clearly."],
              [Sparkles, "2. Extract", "Run the provided prompt in your AI tool."],
              [ClipboardCheck, "3. Review", "Paste JSON, validate it, then save."],
            ].map(([Icon, title, description], index) => {
              const StepIcon = Icon as typeof Camera;
              return (
                <div key={title as string} className={`flex gap-3 p-4 ${index > 0 ? "border-t border-violet-500/15 sm:border-l sm:border-t-0" : ""}`}>
                  <StepIcon className="mt-0.5 h-4 w-4 shrink-0 text-violet-700 dark:text-violet-300" />
                  <div>
                    <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">{title as string}</p>
                    <p className="mt-1 text-sm leading-4 text-violet-800/70 dark:text-violet-200/70">{description as string}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <AiImportFlow />
      </div>
    </AdminShell>
  );
}
