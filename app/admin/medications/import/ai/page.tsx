import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { AdminShell } from "@/app/components/admin/AdminShell";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AiImportFlow } from "./AiImportFlow";

export const metadata = { title: "AI-Assisted Import — Medication" };

export default async function AiImportPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AdminShell
      user={user}
      title="AI-Assisted Import"
      subtitle="Provider-agnostic: bring your own AI (ChatGPT, Claude, Gemini, Grok, GLM, Kimi). No AI API costs, no vendor lock-in."
    >
      <div className="mb-6">
        <Link
          href="/admin/medications/add"
          className="group inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to acquisition chooser
        </Link>
      </div>

      <div className="mx-auto max-w-4xl">
        <div className="mb-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-400">
            <Sparkles className="h-4 w-4" /> How this works
          </p>
          <ol className="mt-2 space-y-1 text-xs text-purple-700/80 dark:text-purple-400/80 list-decimal list-inside">
            <li>Copy our extraction prompt below.</li>
            <li>Open your AI tool of choice (ChatGPT, Claude, Gemini, etc.).</li>
            <li>Take photos of the medicine pack (front, back, leaflet) and attach them with the pasted prompt.</li>
            <li>Copy the AI&apos;s JSON response and paste it back here.</li>
            <li>We parse it, you review, then save. Partial data is fine (progressive enrichment).</li>
          </ol>
        </div>

        <AiImportFlow />
      </div>
    </AdminShell>
  );
}
