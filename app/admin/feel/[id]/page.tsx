import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminShell } from "@/app/components/admin/AdminShell";
import AdminFeelSessionClient, {
  type AdminFeelSession,
} from "@/app/components/admin/AdminFeelSessionClient";
import { acknowledgeSymptomSessionForStaff } from "@/app/lib/services/symptom-triage";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Symptom session" };

export default async function AdminFeelSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const session = await prisma.symptomSession.findUnique({
    where: { id },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          user: { select: { email: true } },
        },
      },
      messages: { orderBy: { createdAt: "asc" } },
      checkIns: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session) notFound();

  // First paint: clear urgent alerts for this thread.
  await acknowledgeSymptomSessionForStaff({
    sessionId: session.id,
    staffUserId: user.id,
  });

  const initial: AdminFeelSession = {
    id: session.id,
    status: session.status,
    category: session.category,
    chiefComplaint: session.chiefComplaint,
    aiSummary: session.aiSummary,
    provisionalLabel: session.provisionalLabel,
    severity: session.severity,
    feelingTrend: session.feelingTrend,
    escalatedAt: session.escalatedAt?.toISOString() ?? null,
    escalatedReason: session.escalatedReason,
    conversationId: session.conversationId,
    guestKey: session.guestKey,
    messageCount: session.messageCount,
    lastMessageAt: session.lastMessageAt?.toISOString() ?? null,
    customer: session.customer
      ? {
          id: session.customer.id,
          fullName: session.customer.fullName,
          phone: session.customer.phone,
          email: session.customer.user?.email ?? null,
        }
      : null,
    messages: session.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      imageUrls: m.imageUrls,
      createdAt: m.createdAt.toISOString(),
    })),
    checkIns: session.checkIns.map((c) => ({
      id: c.id,
      feeling: c.feeling,
      notes: c.notes,
      score: c.score,
      createdAt: c.createdAt.toISOString(),
    })),
  };

  return (
    <AdminShell
      user={user}
      title={session.provisionalLabel || session.chiefComplaint || "Symptom session"}
      subtitle={`${session.status} · live thread`}
      actions={
        <Link
          href="/admin/feel"
          className="inline-flex items-center gap-1.5 rounded-xl border admin-border px-3 py-1.5 text-xs font-semibold admin-text hover:bg-[var(--admin-inset)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Inbox
        </Link>
      }
    >
      <AdminFeelSessionClient initial={initial} />
    </AdminShell>
  );
}
