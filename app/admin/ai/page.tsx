import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { formatDateTime } from "@/app/lib/time";
import { Brain, AlertCircle, Mail, Phone, Clock, ChevronDown, User, Zap, Activity, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "AI Escalations" };

export default async function AdminAiEscalationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [conversations, aiStats, lowAdherence] = await Promise.all([
    prisma.aiConversation.findMany({
      where: { escalated: true },
      include: {
        customer: { select: { id: true, fullName: true, phone: true, user: { select: { email: true } } } },
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { escalatedAt: "desc" },
      take: 50,
    }),
    prisma.aiConversation.aggregate({ _count: true }),
    prisma.prescription.findMany({
      where: { status: "active" },
      include: {
        customer: { select: { id: true, fullName: true } },
        adherence: { orderBy: { takenOn: "desc" }, take: 14 },
      },
      take: 50,
    }),
  ]);

  const adherenceAlerts = lowAdherence
    .map((p) => {
      const taken = p.adherence.filter((a) => a.status === "taken").length;
      const rate = p.adherence.length > 0 ? (taken / p.adherence.length) * 100 : null;
      return { prescription: p, rate, logCount: p.adherence.length };
    })
    .filter((a) => a.rate !== null && a.rate < 70 && a.logCount >= 3)
    .map((a) => ({ ...a, rate: a.rate as number }));

  return (
    <AdminShell
      user={user}
      title="AI review queue"
      subtitle="Handle clinical escalations first, then review adherence risks that need human judgement."
      actions={
        <Link href="/admin/adherence" className="btn-admin w-full justify-center sm:w-auto">
          <Activity className="h-4 w-4" /> Adherence follow-up
        </Link>
      }
    >
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          <div className="admin-stat p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-2"><p className="text-[11px] font-semibold uppercase leading-4 tracking-wide admin-muted sm:text-xs">Open escalations</p><AlertCircle className="h-4 w-4 shrink-0 text-amber-600" /></div>
            <p className="mt-1 text-2xl font-bold text-amber-600">{conversations.length}</p>
          </div>
          <div className="admin-stat p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-2"><p className="text-[11px] font-semibold uppercase leading-4 tracking-wide admin-muted sm:text-xs">Total AI convos</p><Sparkles className="h-4 w-4 shrink-0 admin-accent-text" /></div>
            <p className="mt-1 text-2xl font-bold admin-text">{aiStats._count}</p>
          </div>
          <div className="admin-stat p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-2"><p className="text-[11px] font-semibold uppercase leading-4 tracking-wide admin-muted sm:text-xs">With customer</p><User className="h-4 w-4 shrink-0 admin-accent-text" /></div>
            <p className="mt-1 text-2xl font-bold admin-text">{conversations.filter((c) => c.customer).length}</p>
          </div>
          <div className="admin-stat p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-2"><p className="text-[11px] font-semibold uppercase leading-4 tracking-wide admin-muted sm:text-xs">Adherence alerts</p><Activity className="h-4 w-4 shrink-0 text-rose-500" /></div>
            <p className="mt-1 text-2xl font-bold text-rose-500">{adherenceAlerts.length}</p>
          </div>
        </div>

        {adherenceAlerts.length > 0 && (
          <AdminPanel
            title="Adherence alerts"
            description="Patients below 70% adherence in the last 14 days. Review these before lower-risk AI conversations."
            action={<span className="inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-full border border-[var(--admin-border)] bg-[var(--admin-accent-soft)] px-3 text-xs font-semibold admin-accent-text sm:w-auto"><Sparkles className="h-3 w-3" /> AI-assisted triage</span>}
          >
            <ul className="space-y-2.5">
              {adherenceAlerts.map(({ prescription, rate, logCount }) => (
                <li key={prescription.id} className="flex flex-col gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] p-3.5 transition-[border-color,background-color] hover:border-rose-500/35 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words font-semibold admin-text">{prescription.medicineName}</p>
                      <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-500">{Math.round(rate)}%</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 admin-muted">{prescription.customer?.fullName || "Patient"} · {logCount} adherence logs</p>
                  </div>
                  <Link href={`/admin/prescriptions/${prescription.id}`} className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-inset)] px-3 text-xs font-semibold admin-accent-text transition hover:bg-[var(--admin-inset-2)] sm:w-auto">
                    Review patient <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </AdminPanel>
        )}

        <AdminPanel title="Escalated conversations" description="Open a transcript only when you need the context; the latest patient message stays visible by default.">
          {conversations.length === 0 ? (
            <AdminEmptyState icon={Brain} title="No escalated AI conversations" description="When the assistant escalates a conversation to a human, it will appear here." />
          ) : (
            <ul className="space-y-3">
              {conversations.map((conv) => {
                const latestUserMessage = [...conv.messages].reverse().find((m) => m.role === "user");
                return (
                  <li key={conv.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-3.5 transition-[border-color,background-color] hover:border-amber-500/40 sm:p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600"><Zap className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold admin-text">{conv.customer?.fullName || "Website visitor"}</p>
                        <div className="mt-1 flex flex-col gap-1 text-xs admin-muted sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
                          {conv.customer?.user.email && <span className="inline-flex min-w-0 items-center gap-1"><Mail className="h-3 w-3 shrink-0" /><span className="break-all">{conv.customer.user.email}</span></span>}
                          {conv.customer?.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" />{conv.customer.phone}</span>}
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3 shrink-0" />{conv.escalatedAt ? formatDateTime(conv.escalatedAt) : "Escalated"}</span>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 break-words rounded-xl bg-[var(--admin-inset)] px-3 py-2.5 text-sm leading-6 admin-text">{latestUserMessage?.content || conv.summary || "No message content captured."}</p>

                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      {conv.customer?.id ? (
                        <Link href={`/admin/customers/${conv.customer.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-xs font-semibold admin-accent-text hover:bg-[var(--admin-inset)] sm:min-h-0 sm:justify-start sm:px-0 sm:hover:bg-transparent sm:hover:underline">Open patient record <ArrowRight className="ml-1 h-3 w-3" /></Link>
                      ) : <span />}
                    </div>

                    {conv.messages.length > 0 && (
                      <details className="mt-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-2.5 sm:p-3">
                        <summary className="flex min-h-10 cursor-pointer items-center gap-1.5 text-xs font-semibold admin-muted hover:text-[var(--admin-text)]"><ChevronDown className="h-3.5 w-3.5" /> View transcript ({conv.messages.length} messages)</summary>
                        <div className="mt-2 space-y-2">
                          {conv.messages.map((m) => (
                            <div key={m.id} className={`rounded-xl px-3 py-2.5 text-sm ${m.role === "user" ? "bg-[var(--admin-inset)] sm:ml-8" : "bg-[var(--admin-accent-soft)] sm:mr-8"}`}>
                              <span className="text-[10px] font-semibold uppercase tracking-wide admin-soft">{m.role}</span>
                              <p className="mt-1 whitespace-pre-wrap break-words leading-6 admin-text">{m.content}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
