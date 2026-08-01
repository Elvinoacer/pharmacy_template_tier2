import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import PortalShell, { Panel } from "@/app/components/portal/PortalShell";

export const metadata = { title: "Messages" };

export default async function PortalMessagesPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");

  const [conversations, notifications] = await Promise.all([
    prisma.conversation.findMany({
      where: { customerId: user.customerId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { lastMessageAt: "desc" },
    }),
    prisma.notification.findMany({
      where: { customerId: user.customerId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <PortalShell user={user} title="Messages & notifications">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Conversations">
          {conversations.length === 0 ? (
            <p className="text-sm text-[#5a6b62]">No conversations yet.</p>
          ) : (
            <div className="space-y-4">
              {conversations.map((c) => (
                <div key={c.id} className="rounded-2xl border border-teal-900/8 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{c.subject || c.channel}</p>
                    <span className="text-[10px] uppercase tracking-wide text-[#5a6b62]">{c.status}</span>
                  </div>
                  <ul className="space-y-2">
                    {c.messages.map((m) => (
                      <li
                        key={m.id}
                        className={`rounded-xl px-3 py-2 text-sm ${
                          m.direction === "outbound" ? "bg-teal-50" : "bg-slate-50"
                        }`}
                      >
                        <p className="text-[10px] uppercase text-[#8a9a92]">
                          {m.senderType} · {new Date(m.createdAt).toLocaleString()}
                        </p>
                        <p className="mt-0.5">{m.body}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Notification history">
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li key={n.id} className="rounded-2xl border border-teal-900/5 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{n.title}</p>
                  <span className="text-[10px] uppercase text-[#8a9a92]">{n.channel}</span>
                </div>
                <p className="mt-0.5 text-xs text-[#5a6b62]">{n.body}</p>
                <p className="mt-1 text-[10px] text-[#8a9a92]">
                  {n.status} · {new Date(n.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </PortalShell>
  );
}
