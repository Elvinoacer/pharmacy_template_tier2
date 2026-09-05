import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { formatDateTime } from "@/app/lib/time";
import { Brain, AlertCircle, MessageSquare, Mail, Phone, Clock, ChevronDown, User, Zap, Activity, Sparkles } from "lucide-react";

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
    prisma.aiConversation.aggregate({
      _count: true,
    }),
    prisma.prescription.findMany({
      where: { status: "active" },
      include: {
        customer: { select: { id: true, fullName: true } },
        adherence: { orderBy: { takenOn: "desc" }, take: 14 },
      },
      take: 50,
    }),
  ]);

  // Compute low-adherence prescriptions (below 70% in last 14 days).
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
      subtitle="Review conversations and adherence alerts that need a member of staff."
    >
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Open escalations</p>
            <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-700">{conversations.length}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Total AI convos</p>
            <Sparkles className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">{aiStats._count}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide admin-muted">With customer</p>
            <User className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">
            {conversations.filter((c) => c.customer).length}
          </p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Adherence alerts</p>
            <Activity className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <p className="mt-1 text-2xl font-bold text-rose-600">{adherenceAlerts.length}</p>
        </div>
      </div>

      {/* AI adherence alerts */}
      {adherenceAlerts.length > 0 && (
        <AdminPanel
          title="Adherence alerts"
          description="Customers with adherence below 70% in the last 14 days — AI suggests a follow-up"
          className="mb-6"
          action={
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#2dd4bf]/20 to-[#0d6e5a]/20 px-2 py-0.5 text-xs font-semibold admin-accent-text">
              <Sparkles className="h-2.5 w-2.5" /> AI-analyzed
            </span>
          }
        >
          <ul className="space-y-2">
            {adherenceAlerts.map(({ prescription, rate, logCount }) => (
              <li
                key={prescription.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold admin-text">{prescription.medicineName}</p>
                  <p className="text-xs admin-muted">
                    {prescription.customer?.fullName} · {logCount} logs in last 14 days
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-rose-600">{Math.round(rate)}%</span>
                  <a
                    href={`/admin/prescriptions/${prescription.id}`}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-inset)] px-2.5 py-1 text-xs font-semibold admin-accent-text hover:bg-[var(--admin-inset-2)]"
                  >
                    Review →
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </AdminPanel>
      )}

      <AdminPanel
        title="Escalated conversations"
        description="Click a conversation to view the full transcript"
      >
        {conversations.length === 0 ? (
          <AdminEmptyState
            icon={Brain}
            title="No escalated AI conversations"
            description="When the assistant escalates a conversation to a human, it will appear here."
          />
        ) : (
          <ul className="space-y-3">
            {conversations.map((conv) => {
              const latestUserMessage = [...conv.messages].reverse().find((m) => m.role === "user");
              return (
                <li
                  key={conv.id}
                  className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 transition hover:border-amber-500/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/15 text-amber-700">
                          <Zap className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold admin-text">
                            {conv.customer?.fullName || "Website visitor"}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs admin-muted">
                            {conv.customer?.user.email && (
                              <span className="inline-flex items-center gap-0.5">
                                <Mail className="h-2.5 w-2.5" /> {conv.customer.user.email}
                              </span>
                            )}
                            {conv.customer?.phone && (
                              <span className="inline-flex items-center gap-0.5">
                                <Phone className="h-2.5 w-2.5" /> {conv.customer.phone}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" /> {conv.escalatedAt ? formatDateTime(conv.escalatedAt) : "Escalated"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 rounded-lg bg-[var(--admin-inset)] px-3 py-2 text-sm admin-text">
                        {latestUserMessage?.content || conv.summary || "No message content captured."}
                      </p>
                      {conv.customer?.id && (
                        <a
                          href={`/admin/customers/${conv.customer.id}`}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold admin-accent-text hover:underline"
                        >
                          Open in CRM →
                        </a>
                      )}
                    </div>
                  </div>
                  {conv.messages.length > 0 && (
                    <details className="mt-3">
                      <summary className="flex cursor-pointer items-center gap-1 text-xs font-semibold admin-muted hover:text-[var(--admin-text)]">
                        <ChevronDown className="h-3 w-3" /> View transcript ({conv.messages.length} messages)
                      </summary>
                      <div className="mt-2 space-y-2">
                        {conv.messages.map((m) => (
                          <div
                            key={m.id}
                            className={`rounded-lg px-3 py-2 text-sm ${
                              m.role === "user"
                                ? "ml-8 bg-[var(--admin-inset)]"
                                : "mr-8 bg-[var(--admin-accent-soft)]"
                            }`}
                          >
                            <span className="text-xs uppercase tracking-wide admin-soft">
                              {m.role}
                            </span>
                            <p className="mt-1 whitespace-pre-wrap admin-text">{m.content}</p>
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
    </AdminShell>
  );
}
