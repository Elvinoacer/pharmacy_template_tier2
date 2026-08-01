import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import AdminShell, { AdminPanel } from "@/app/components/admin/AdminShell";

export const metadata = { title: "Communication center" };

export default async function AdminMessagesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const conversations = await prisma.conversation.findMany({
    include: {
      customer: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      assignedTo: { select: { email: true } },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  return (
    <AdminShell user={user} title="Communication center">
      <p className="mb-4 text-sm text-teal-100/50">
        Centralized email, SMS, WhatsApp, and portal threads. Send new messages from a customer
        record.
      </p>
      <AdminPanel title="Recent conversations">
        <div className="space-y-3">
          {conversations.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3">
              <div>
                <p className="font-medium">
                  {c.customer?.fullName || "Unknown"} ·{" "}
                  <span className="capitalize text-teal-200/70">{c.channel}</span>
                </p>
                <p className="text-sm text-teal-100/60">{c.subject || c.messages[0]?.body?.slice(0, 80)}</p>
                <p className="text-[10px] text-teal-100/30">
                  {c.status} · assigned {c.assignedTo?.email || "—"} ·{" "}
                  {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : ""}
                </p>
              </div>
              {c.customerId && (
                <a href={`/admin/customers/${c.customerId}`} className="text-xs text-teal-300 hover:underline">
                  Open CRM
                </a>
              )}
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="text-sm text-teal-100/50">No conversations yet.</p>
          )}
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
