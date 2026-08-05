import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { AdminPanel } from "@/app/components/admin/AdminUI";
import SymptomSessionReplyForm from "@/app/components/admin/SymptomSessionReplyForm";
import FeelAttentionRefresh from "@/app/components/admin/FeelAttentionRefresh";
import { acknowledgeSymptomSessionForStaff } from "@/app/lib/services/symptom-triage";
import { formatDateTime } from "@/app/lib/time";
import {
  ArrowLeft,
  Image as ImageIcon,
  Sparkles,
  Stethoscope,
  User,
} from "lucide-react";

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

  // Viewing the thread acknowledges urgent alerts → sidebar badge clears.
  await acknowledgeSymptomSessionForStaff({
    sessionId: session.id,
    staffUserId: user.id,
  });

  return (
    <AdminShell
      user={user}
      title={session.provisionalLabel || session.chiefComplaint || "Symptom session"}
      subtitle={`${session.status} · ${session.messageCount} messages`}
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
      <FeelAttentionRefresh />

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <AdminPanel title="AI summary for staff" description="Rolling non-diagnostic overview">
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                {session.status}
              </span>
              {session.severity && (
                <span className="rounded-full bg-[var(--admin-inset)] px-2.5 py-0.5 text-[10px] font-semibold uppercase admin-muted">
                  {session.severity}
                </span>
              )}
              {session.category && (
                <span className="rounded-full bg-[var(--admin-inset)] px-2.5 py-0.5 text-[10px] font-semibold uppercase admin-muted">
                  {session.category}
                </span>
              )}
            </div>
            {session.aiSummary ? (
              <p className="leading-relaxed admin-text whitespace-pre-wrap">{session.aiSummary}</p>
            ) : (
              <p className="admin-muted">Summary will appear after a few exchanges.</p>
            )}
            {session.escalatedReason && (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
                Escalation: {session.escalatedReason}
                {session.escalatedAt ? ` · ${formatDateTime(session.escalatedAt)}` : ""}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-xs admin-muted">
              {session.conversationId && (
                <Link href="/admin/messages" className="font-semibold admin-accent-text hover:underline">
                  CRM conversation
                </Link>
              )}
              <span className="rounded-full bg-[var(--admin-inset)] px-2 py-0.5 text-[10px] font-semibold uppercase admin-soft">
                How do you feel · not a contact enquiry
              </span>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Visitor" description="Who started this check-in">
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 font-semibold admin-text">
              <User className="h-4 w-4 admin-accent-text" />
              {session.customer?.fullName || "Guest visitor"}
            </p>
            {session.customer?.user?.email && (
              <p className="text-xs admin-muted">{session.customer.user.email}</p>
            )}
            {session.customer?.phone && (
              <p className="text-xs admin-muted">{session.customer.phone}</p>
            )}
            {session.customer?.id && (
              <Link
                href={`/admin/customers/${session.customer.id}`}
                className="text-xs font-semibold admin-accent-text hover:underline"
              >
                Open customer profile →
              </Link>
            )}
            {session.guestKey && (
              <p className="text-[10px] admin-soft">Guest key: {session.guestKey.slice(0, 18)}…</p>
            )}
            {session.checkIns.length > 0 && (
              <div className="mt-3 border-t admin-border pt-3">
                <p className="text-[10px] font-bold uppercase tracking-wider admin-muted">
                  Feeling trend
                </p>
                <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto pr-1">
                  {session.checkIns.map((c) => (
                    <li key={c.id} className="text-xs admin-text">
                      <span className="font-semibold capitalize">{c.feeling}</span>
                      {c.score != null ? ` (${c.score}/10)` : ""} · {formatDateTime(c.createdAt)}
                      {c.notes ? ` — ${c.notes}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </AdminPanel>
      </div>

      {/* Fixed-height chat panel so long transcripts don't stretch the page */}
      <section className="admin-card flex h-[min(68vh,calc(100dvh-12rem))] min-h-[420px] flex-col overflow-hidden p-0">
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b admin-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold admin-text">Conversation</h2>
            <p className="mt-0.5 text-xs admin-muted">
              Full transcript including images — AI until escalation, then staff. Scroll inside this
              panel.
            </p>
          </div>
          <span className="rounded-full bg-[var(--admin-inset)] px-2.5 py-1 text-[10px] font-semibold uppercase admin-muted">
            {session.messages.length} messages
          </span>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[1.25fr_0.75fr]">
          <ul className="min-h-0 space-y-3 overflow-y-auto px-5 py-4">
            {session.messages.map((m) => {
              const isUser = m.role === "user";
              const isStaff = m.role === "staff";
              return (
                <li
                  key={m.id}
                  className={`rounded-xl border px-3 py-2.5 text-sm ${
                    isUser
                      ? "border-teal-500/20 bg-teal-500/5"
                      : isStaff
                        ? "border-amber-500/25 bg-amber-500/10"
                        : m.role === "system"
                          ? "border-dashed admin-border bg-[var(--admin-inset)]"
                          : "admin-border bg-[var(--admin-panel)]"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider admin-muted">
                      {m.role === "assistant" ? (
                        <span className="inline-flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> AI
                        </span>
                      ) : m.role === "staff" ? (
                        <span className="inline-flex items-center gap-1">
                          <Stethoscope className="h-3 w-3" /> Staff
                        </span>
                      ) : (
                        m.role
                      )}
                    </span>
                    <span className="text-[10px] admin-soft">{formatDateTime(m.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed admin-text">{m.content}</p>
                  {m.imageUrls?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.imageUrls.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative block overflow-hidden rounded-lg border admin-border"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="Attachment" className="h-28 w-28 object-cover" />
                          <span className="absolute bottom-1 right-1 rounded bg-black/50 p-0.5 text-white">
                            <ImageIcon className="h-3 w-3" />
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex min-h-0 flex-col border-t admin-border lg:border-l lg:border-t-0">
            <div className="shrink-0 border-b admin-border px-5 py-3">
              <h3 className="text-sm font-semibold admin-text">Staff reply</h3>
              <p className="mt-0.5 text-xs admin-muted">
                Visitor sees this in their check-in thread
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <SymptomSessionReplyForm sessionId={session.id} status={session.status} />
              <p className="mt-4 text-[11px] leading-relaxed admin-muted">
                After escalation, AI stops clinical advice. Your reply is the source of truth for the
                visitor. Use careful language — this is not a substitute for an in-person exam when
                one is needed.
              </p>
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
