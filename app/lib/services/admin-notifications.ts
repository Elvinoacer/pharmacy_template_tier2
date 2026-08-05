import "server-only";

import { prisma } from "@/app/lib/db";

/**
 * Helpers to record inbound admin notifications. Whenever an event happens
 * that staff need to know about (new refill, low feedback, failed send,
 * stock-low, AI escalation), call one of these. They are best-effort and
 * never throw — the calling flow should not break if the admin inbox write
 * fails.
 */

export type AdminNotifType =
  | "refill_new"
  | "enquiry_new"
  | "feedback_low"
  | "feedback_new"
  | "ai_escalation"
  | "stock_low"
  | "payment_failed"
  | "campaign_failed"
  | "reminder_failed"
  | "message_failed"
  | "adherence_low"
  | "symptom_escalation"
  | "symptom_checkin";

export type AdminNotifSeverity = "info" | "warning" | "critical";

export async function recordAdminNotification(input: {
  type: AdminNotifType;
  title: string;
  body: string;
  severity?: AdminNotifSeverity;
  relatedType?: string;
  relatedId?: string;
  retryAction?: string;
  retryPayload?: Record<string, unknown>;
}): Promise<void> {
  try {
    const severity =
      input.severity ??
      (input.type === "payment_failed" ||
      input.type === "campaign_failed" ||
      input.type === "reminder_failed" ||
      input.type === "ai_escalation" ||
      input.type === "symptom_escalation"
        ? "critical"
        : input.type === "stock_low" ||
            input.type === "feedback_low" ||
            input.type === "adherence_low" ||
            input.type === "symptom_checkin"
          ? "warning"
          : "info");
    await prisma.adminNotification.create({
      data: {
        type: input.type,
        title: input.title,
        body: input.body,
        severity,
        relatedType: input.relatedType ?? null,
        relatedId: input.relatedId ?? null,
        retryAction: input.retryAction ?? null,
        retryPayload: (input.retryPayload ?? {}) as object,
      },
    });
  } catch (err) {
    console.error("[admin-notification] failed to record:", err);
  }
}

/** Convenience: record a retryable failed-send admin notification. */
export async function recordFailedSend(input: {
  channel: string;
  recipient: string;
  error: string;
  relatedType: string;
  relatedId: string;
  retryAction: "resend_message" | "resend_reminder" | "resend_campaign";
  retryPayload: Record<string, unknown>;
}): Promise<void> {
  await recordAdminNotification({
    type:
      input.retryAction === "resend_reminder"
        ? "reminder_failed"
        : input.retryAction === "resend_campaign"
          ? "campaign_failed"
          : "message_failed",
    title: `Failed ${input.channel} send`,
    body: `To ${input.recipient}: ${input.error}`,
    severity: "critical",
    relatedType: input.relatedType,
    relatedId: input.relatedId,
    retryAction: input.retryAction,
    retryPayload: input.retryPayload,
  });
}
