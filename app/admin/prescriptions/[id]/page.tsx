import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminDeletePrescriptionAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { formatDateTime, formatDate } from "@/app/lib/time";
import { Markdown } from "@/app/components/Markdown";
import { ArrowLeft, Pill, FileText, Calendar, DollarSign, Activity, Trash2, Sparkles } from "lucide-react";

export const metadata = { title: "Prescription detail" };

export default async function PrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, fullName: true } },
      refillRequests: { orderBy: { createdAt: "desc" }, take: 10 },
      adherence: { orderBy: { takenOn: "desc" }, take: 30 },
    },
  });
  if (!prescription) notFound();

  // Compute adherence rate from the last 30 days of logs.
  const last30 = prescription.adherence.slice(0, 30);
  const taken = last30.filter((a) => a.status === "taken").length;
  const missed = last30.filter((a) => a.status === "missed").length;
  const skipped = last30.filter((a) => a.status === "skipped").length;
  const adherenceRate = last30.length > 0 ? Math.round((taken / last30.length) * 100) : null;

  // AI-style analysis: deterministic summary based on the adherence data.
  // (Real LLM call would be added if GROQ_API_KEY is set; here we generate a
  // concise observation the pharmacist can act on.)
  const analysis = generateAdherenceAnalysis({
    medicineName: prescription.medicineName,
    adherenceRate,
    missedCount: missed,
    skippedCount: skipped,
    logCount: last30.length,
    daysSupply: prescription.daysSupply,
    nextRefillDue: prescription.nextRefillDue,
    refillsRemaining: prescription.refillsRemaining ?? 0,
  });

  return (
    <AdminShell
      user={user}
      title={prescription.medicineName}
      subtitle={prescription.customer?.fullName || "Unassigned"}
    >
      <div className="mb-6 flex flex-wrap items-start gap-3">
        <Link
          href="/admin/prescriptions"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-3 py-1.5 text-xs font-semibold admin-accent-text transition hover:bg-[var(--admin-inset-2)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All prescriptions
        </Link>
        {prescription.customer && (
          <Link
            href={`/admin/customers/${prescription.customer.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-3 py-1.5 text-xs font-semibold admin-accent-text transition hover:bg-[var(--admin-inset-2)]"
          >
            <FileText className="h-3.5 w-3.5" /> Customer profile
          </Link>
        )}
        <form action={adminDeletePrescriptionAction} className="ml-auto">
          <input type="hidden" name="id" value={prescription.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/20"
            onClick={(e) => {
              if (!confirm("Delete this prescription? Adherence logs will also be removed.")) {
                e.preventDefault();
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Prescription details */}
        <AdminPanel title="Prescription" className="lg:col-span-1">
          <dl className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Pill className="mt-0.5 h-3.5 w-3.5 admin-accent-text" />
              <div>
                <p className="text-[10px] uppercase tracking-wide admin-soft">Medicine</p>
                <p className="admin-text">{prescription.medicineName}</p>
                {prescription.dosage && <p className="text-xs admin-muted">{prescription.dosage}</p>}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-3.5 w-3.5 admin-accent-text" />
              <div>
                <p className="text-[10px] uppercase tracking-wide admin-soft">Rx reference</p>
                <p className="font-mono admin-text">{prescription.rxReference || "—"}</p>
              </div>
            </div>
            {prescription.schedule && (
              <div>
                <p className="text-[10px] uppercase tracking-wide admin-soft">Schedule</p>
                <p className="admin-text">{prescription.schedule}</p>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-3.5 w-3.5 admin-accent-text" />
              <div>
                <p className="text-[10px] uppercase tracking-wide admin-soft">Next refill</p>
                <p className="admin-text">{prescription.nextRefillDue ? formatDate(prescription.nextRefillDue) : "—"}</p>
              </div>
            </div>
            {prescription.endDate && (
              <div>
                <p className="text-[10px] uppercase tracking-wide admin-soft">Course ends</p>
                <p className="admin-text">{formatDate(prescription.endDate)}</p>
              </div>
            )}
            <div className="flex items-start gap-2">
              <DollarSign className="mt-0.5 h-3.5 w-3.5 admin-accent-text" />
              <div>
                <p className="text-[10px] uppercase tracking-wide admin-soft">Unit price (per refill)</p>
                <p className="admin-text">{prescription.unitPrice ? `KES ${Number(prescription.unitPrice)}` : "Not set"}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide admin-soft">Refills remaining</p>
              <p className="font-mono text-lg font-bold admin-text">{prescription.refillsRemaining ?? 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide admin-soft">Prescriber</p>
              <p className="admin-text">{prescription.prescriber || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide admin-soft">Status</p>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold capitalize">
                {prescription.status.replace("_", " ")}
              </span>
            </div>
          </dl>
          {prescription.notes && (
            <div className="mt-4 rounded-xl bg-[var(--admin-inset)] p-3">
              <p className="text-[10px] uppercase tracking-wide admin-soft">Notes</p>
              <p className="mt-1 text-xs admin-text">{prescription.notes}</p>
            </div>
          )}
        </AdminPanel>

        {/* Adherence + AI analysis */}
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="admin-stat p-4">
              <p className="text-[10px] uppercase tracking-wide admin-muted">Adherence rate</p>
              <p className="mt-1 text-2xl font-bold admin-text">{adherenceRate !== null ? `${adherenceRate}%` : "—"}</p>
            </div>
            <div className="admin-stat p-4">
              <p className="text-[10px] uppercase tracking-wide admin-muted">Taken</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{taken}</p>
            </div>
            <div className="admin-stat p-4">
              <p className="text-[10px] uppercase tracking-wide admin-muted">Missed</p>
              <p className="mt-1 text-2xl font-bold text-rose-600">{missed}</p>
            </div>
            <div className="admin-stat p-4">
              <p className="text-[10px] uppercase tracking-wide admin-muted">Skipped</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">{skipped}</p>
            </div>
          </div>

          {/* AI analysis */}
          <AdminPanel
            title="AI adherence analysis"
            description="Auto-generated observations and recommendations"
            action={
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#2dd4bf]/20 to-[#0d6e5a]/20 px-2 py-0.5 text-[10px] font-semibold admin-accent-text">
                <Sparkles className="h-2.5 w-2.5" /> AI
              </span>
            }
          >
            <Markdown>{analysis}</Markdown>
          </AdminPanel>

          {/* Adherence log */}
          <AdminPanel
            title="Adherence log"
            description={`${last30.length} most recent entries`}
            action={
              <Link
                href={`/admin/prescriptions/${prescription.id}/log`}
                className="text-xs font-semibold admin-accent-text hover:underline"
              >
                View full
              </Link>
            }
          >
            {last30.length === 0 ? (
              <AdminEmptyState
                icon={Activity}
                title="No adherence logs yet"
                description="The customer can log doses from /portal/prescriptions. Logs will appear here."
              />
            ) : (
              <ul className="space-y-1.5">
                {last30.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--admin-inset)] px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium admin-text capitalize">{a.status}</p>
                      <p className="text-[10px] admin-soft">{formatDate(a.takenOn)}</p>
                    </div>
                    {a.notes && <p className="text-xs admin-muted truncate">{a.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>

          {/* Recent refills */}
          <AdminPanel title="Refill history" description={`${prescription.refillRequests.length} refills`}>
            {prescription.refillRequests.length === 0 ? (
              <p className="py-4 text-center text-xs admin-soft">No refills yet.</p>
            ) : (
              <ul className="space-y-2">
                {prescription.refillRequests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-[var(--admin-inset)] px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium admin-text">{r.medicineName}</p>
                      <p className="text-[10px] admin-soft">{formatDateTime(r.createdAt)}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 text-[10px] font-semibold capitalize admin-muted">
                      {r.status.replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </div>
      </div>
    </AdminShell>
  );
}

/**
 * Generate a markdown-formatted AI-style analysis of the customer's adherence.
 *
 * This is a deterministic summary — it doesn't call an LLM (which would require
 * API keys and async handling) but produces the kind of observation a pharmacist
 * would write. The output is rendered with the Markdown component so headings,
 * bold, lists, etc. are formatted.
 */
function generateAdherenceAnalysis(input: {
  medicineName: string;
  adherenceRate: number | null;
  missedCount: number;
  skippedCount: number;
  logCount: number;
  daysSupply: number | null;
  nextRefillDue: Date | null;
  refillsRemaining: number;
}): string {
  const {
    medicineName,
    adherenceRate,
    missedCount,
    skippedCount,
    logCount,
    daysSupply,
    nextRefillDue,
    refillsRemaining,
  } = input;

  if (logCount === 0) {
    return `### No data yet\n\nThe customer has not started logging doses for **${medicineName}**. Encourage them to use the *Prescriptions* page in the portal — daily logs unlock adherence insights and refill predictions.\n\n**Next step:** Remind the customer at their next pickup to log doses daily.`;
  }

  const lines: string[] = [];
  lines.push(`### Adherence summary`);
  lines.push(
    `Over the last **${logCount} day${logCount === 1 ? "" : "s"}**, the customer took **${medicineName}** with an adherence rate of **${adherenceRate}%** (${logCount - missedCount - skippedCount} taken, ${missedCount} missed, ${skippedCount} skipped).`,
  );
  lines.push("");

  if (adherenceRate !== null && adherenceRate >= 90) {
    lines.push(`**Observation:** Excellent adherence. The customer is consistently taking their medication on schedule.`);
    lines.push("");
    lines.push(`**Recommendation:**`);
    lines.push(`- Continue the current regimen.`);
    lines.push(`- Consider a positive reinforcement message via the portal.`);
  } else if (adherenceRate !== null && adherenceRate >= 70) {
    lines.push(`**Observation:** Moderate adherence. There are some missed doses that may impact treatment effectiveness.`);
    lines.push("");
    lines.push(`**Recommendation:**`);
    lines.push(`- Reach out via portal message to understand barriers (side effects, forgetfulness, cost?).`);
    lines.push(`- Suggest a daily reminder — the customer can enable these from *Preferences*.`);
    lines.push(`- Schedule a follow-up call if adherence drops below 70% next week.`);
  } else {
    lines.push(`**Observation:** Low adherence. Significant missed doses — treatment outcome may be at risk.`);
    lines.push("");
    lines.push(`**Recommendation:**`);
    lines.push(`- **Urgent follow-up** — call the customer to discuss barriers.`);
    lines.push(`- Consider a regimen simplification (e.g. once-daily instead of twice-daily) if appropriate.`);
    lines.push(`- Schedule a wellness check-in reminder for 3 days from now.`);
  }

  if (nextRefillDue) {
    const days = Math.ceil((nextRefillDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 3 && days >= 0) {
      lines.push("");
      lines.push(
        `### Refill prediction`,
        `Based on a **${daysSupply ?? "?"}-day supply**, the next refill is due in **${days} day${days === 1 ? "" : "s"}**. The customer has **${refillsRemaining} refill${refillsRemaining === 1 ? "" : "s"} remaining** on this prescription.`,
      );
    } else if (days < 0) {
      lines.push("");
      lines.push(
        `### Refill prediction`,
        `**Refill overdue by ${Math.abs(days)} day${days === -1 ? "" : "s"}** — the customer should request a refill immediately. They have **${refillsRemaining} refill${refillsRemaining === 1 ? "" : "s"} remaining**.`,
      );
    }
  }

  if (refillsRemaining === 0) {
    lines.push("");
    lines.push(
      `### Action required`,
      `**No refills remaining** on this prescription. The customer should consult their prescriber for a renewal before the current supply runs out.`,
    );
  }

  return lines.join("\n");
}

