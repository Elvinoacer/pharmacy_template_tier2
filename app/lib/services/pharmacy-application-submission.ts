import "server-only";
import { prismaUnscoped } from "@/app/lib/db";
import { processJobBatch } from "@/app/lib/platform/jobs";
import { withPlatformBypass } from "@/app/lib/tenant-context";
import type { PharmacyApplicationNotificationKind } from "./pharmacy-application-notifications";

// Call only after the action has checked ownership, payment and dossier readiness.
export async function submitApplicationForReview(input: {
  pharmacyId: string;
  actorId: string;
  expectedStatus: "draft" | "needs_info";
  kind: PharmacyApplicationNotificationKind;
  meta?: Record<string, unknown>;
}) {
  const job = await prismaUnscoped.$transaction(async (tx) => {
    const changed = await tx.pharmacy.updateMany({
      where: { id: input.pharmacyId, status: input.expectedStatus },
      data: { status: "submitted", submittedAt: new Date() },
    });
    if (!changed.count) return null;
    await tx.pharmacyOnboardingEvent.create({
      data: {
        pharmacyId: input.pharmacyId,
        actorId: input.actorId,
        type: input.kind,
        message: "Application submitted for network review",
        meta: (input.meta ?? {}) as object,
      },
    });
    return tx.job.create({
      data: {
        pharmacyId: input.pharmacyId,
        type: "pharmacy.application.review",
        payload: { kind: input.kind },
      },
    });
  });
  if (!job) return;
  // Try immediately; the committed job survives provider outages or a stopped request.
  try {
    await withPlatformBypass(() => processJobBatch(1, `application-${job.id}`, job.id));
  } catch (error) {
    console.error("[onboard] reviewer email remains queued for retry", { jobId: job.id, error });
  }
}
