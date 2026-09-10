import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminShell } from "@/app/components/admin/AdminShell";
import AdminFeelSessionClient, {
  type AdminFeelSession,
} from "@/app/components/admin/AdminFeelSessionClient";
import { acknowledgeSymptomSessionForStaff } from "@/app/lib/services/symptom-triage";
import { createPrivateMediaToken, isPrivateR2Reference } from "@/app/lib/r2";
import { ArrowLeft } from "lucide-react";
import styles from "./page.module.css";

export const metadata = { title: "Symptom session" };

function presentImage(reference: string): string {
  if (!isPrivateR2Reference(reference)) return reference;
  try {
    return `/api/feel/media?token=${encodeURIComponent(createPrivateMediaToken(reference))}`;
  } catch {
    return "";
  }
}

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
      imageUrls: m.imageUrls.map(presentImage).filter(Boolean),
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
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border admin-border px-3 py-2 text-xs font-semibold admin-text transition hover:bg-[var(--admin-inset)] sm:w-auto sm:justify-start"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to triage
        </Link>
      }
    >
      <div className={styles.detail}>
        <AdminFeelSessionClient initial={initial} />
      </div>
    </AdminShell>
  );
}
