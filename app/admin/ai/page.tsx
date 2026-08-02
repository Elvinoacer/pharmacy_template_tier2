import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import {
  AdminShell,
  AdminPanel,
  AdminEmptyState,
} from "@/app/components/admin/AdminShell";
import { Brain, AlertCircle, MessageSquare, Mail, Phone, Clock, ChevronDown, User, Zap } from "lucide-react";

export const metadata = { title: "AI Escalations" };

export default async function AdminAiEscalationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const conversations = await prisma.aiConversation.findMany({
    where: { escalated: true },
    include: {
      customer: { select: { id: true, fullName: true, phone: true, user: { select: { email: true } } } },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { escalatedAt: "desc" },
    take: 50,
  });

  return (
    <AdminShell
      user={user}
      title="AI escalation inbox"
      subtitle="Conversations the assistant flagged for human review"
    >
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#ecfdf5]/55">Open escalations</p>
            <AlertCircle className="h-3.5 w-3.5 text-amber-300" />
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-300">{conversations.length}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#ecfdf5]/55">With customer</p>
            <User className="h-3.5 w-3.5 text-[#2dd4bf]" />
          </div>
          <p className="mt-1 text-2xl font-bold text-white">
            {conversations.filter((c) => c.customer).length}
          </p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#ecfdf5]/55">Anonymous</p>
            <MessageSquare className="h-3.5 w-3.5 text-[#2dd4bf]" />
          </div>
          <p className="mt-1 text-2xl font-bold text-white">
            {conversations.filter((c) => !c.customer).length}
          </p>
        </div>
      </div>

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
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
                          <Zap className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold text-white">
                            {conv.customer?.fullName || "Website visitor"}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-[#ecfdf5]/55">
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
                              <Clock className="h-2.5 w-2.5" /> {conv.escalatedAt?.toLocaleString() || "Escalated"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-[#ecfdf5]/85">
                        {latestUserMessage?.content || conv.summary || "No message content captured."}
                      </p>
                      {conv.customer?.id && (
                        <a
                          href={`/admin/customers/${conv.customer.id}`}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2dd4bf] hover:underline"
                        >
                          Open in CRM →
                        </a>
                      )}
                    </div>
                  </div>
                  {conv.messages.length > 0 && (
                    <details className="mt-3">
                      <summary className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#ecfdf5]/65 hover:text-white">
                        <ChevronDown className="h-3 w-3" /> View transcript ({conv.messages.length} messages)
                      </summary>
                      <div className="mt-2 space-y-2">
                        {conv.messages.map((m) => (
                          <div
                            key={m.id}
                            className={`rounded-lg px-3 py-2 text-sm ${
                              m.role === "user"
                                ? "ml-8 bg-white/[0.05]"
                                : "mr-8 bg-[#2dd4bf]/[0.07]"
                            }`}
                          >
                            <span className="text-[10px] uppercase tracking-wide text-[#ecfdf5]/45">
                              {m.role}
                            </span>
                            <p className="mt-1 whitespace-pre-wrap text-[#ecfdf5]/85">{m.content}</p>
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
