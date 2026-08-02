import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import AdminShell, { AdminPanel } from "@/app/components/admin/AdminShell";

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
    <AdminShell user={user} title="AI escalation inbox">
      <AdminPanel title="Escalated conversations">
        {conversations.length === 0 ? (
          <p className="text-sm text-teal-100/50">No escalated AI conversations.</p>
        ) : (
          <ul className="space-y-4">
            {conversations.map((conversation) => {
              const latestUserMessage = [...conversation.messages].reverse().find((m) => m.role === "user");
              return (
                <li key={conversation.id} className="rounded-xl border border-white/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-teal-50">
                        {conversation.customer?.fullName || "Website visitor"}
                      </p>
                      <p className="mt-1 text-xs text-teal-100/50">
                        {conversation.customer?.user.email || conversation.sessionKey || conversation.id}
                        {conversation.customer?.phone ? ` · ${conversation.customer.phone}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-300/15 px-2.5 py-1 text-xs font-medium text-amber-100">
                      {conversation.escalatedAt?.toLocaleString() || "Escalated"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-teal-50/80">
                    {latestUserMessage?.content || conversation.summary || "No message content captured."}
                  </p>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium text-teal-200">Transcript</summary>
                    <div className="mt-2 space-y-2 text-sm">
                      {conversation.messages.map((message) => (
                        <div key={message.id} className="rounded-lg bg-white/5 px-3 py-2">
                          <span className="text-xs uppercase text-teal-100/40">{message.role}</span>
                          <p className="mt-1 whitespace-pre-wrap text-teal-50/80">{message.content}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
