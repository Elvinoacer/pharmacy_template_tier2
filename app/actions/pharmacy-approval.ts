"use server";

import { revalidatePath } from "next/cache";
import { prismaUnscoped } from "@/app/lib/db";
import { reviewPharmacyAction, type ReviewActionState } from "@/app/actions/platform";
import { publicErrorMessage } from "@/app/lib/public-error";
import { requirePlatformAction } from "@/app/lib/platform/policy";
import { recordAuditRequired } from "@/app/lib/platform/audit";
import { provisionTenant } from "@/app/lib/platform/provision";
import { startPharmacyService } from "@/app/lib/platform/pharmacy-enrolment";
import { loadApprovalReadiness } from "@/app/lib/services/pharmacy-verification";
import { sendDelivery, type DeliveryResult } from "@/app/lib/services/delivery";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

type ApprovalEmailResult = DeliveryResult & { recipient: string | null };

async function notifyOwnerPharmacyIsApproved(opts: {
  pharmacyId: string;
  pharmacyName: string;
  ownerUserId: string | null;
  pharmacyEmail: string | null;
  notes: string;
  monthlyAmountKes: number;
  monthlyInvoiceStatus: string;
}): Promise<ApprovalEmailResult> {
  let toEmail = opts.pharmacyEmail?.trim() || null;
  let ownerName = "there";

  if (opts.ownerUserId) {
    const owner = await prismaUnscoped.user.findUnique({
      where: { id: opts.ownerUserId },
      select: { email: true, profile: { select: { fullName: true } } },
    });
    if (owner?.email) toEmail = owner.email;
    if (owner?.profile?.fullName) ownerName = owner.profile.fullName.split(" ")[0] || ownerName;
  }

  if (!toEmail) {
    return { status: "failed", recipient: null, error: "No pharmacy owner email is available." };
  }

  const base = appUrl();
  const billingLine =
    opts.monthlyInvoiceStatus === "paid"
      ? "Your current monthly platform-service period is already covered."
      : `Your KES ${opts.monthlyAmountKes.toLocaleString("en-KE")} monthly service invoice is ready inside setup.`;

  const body = [
    `Hi ${ownerName},`,
    "",
    `**${opts.pharmacyName}** has passed pharmacy verification on the Afyvia Pharmacy Network.`,
    opts.notes ? `Reviewer note: ${opts.notes}` : "",
    "",
    "Your verified premises location, map pin and contact details have already been carried into your account.",
    "",
    "Next: finish the guided setup. Add opening hours, a small starter medicine catalogue, one service and your public profile.",
    billingLine,
    "",
    `[Continue setup](${base}/admin/setup)`,
    "",
    "The pharmacy stays off the public directory until you finish setup and choose Publish.",
    "",
    "— Afyvia Network",
  ].filter(Boolean).join("\n");

  try {
    const result = await sendDelivery({
      channel: "email",
      purpose: "transactional",
      recipient: { email: toEmail },
      subject: `${opts.pharmacyName} is verified — finish your setup`,
      body,
    });
    return { ...result, recipient: toEmail };
  } catch (error) {
    console.error("[pharmacy-approval] approval email send failed", error);
    return {
      status: "failed",
      recipient: toEmail,
      error: "The setup email could not be sent right now.",
    };
  }
}

function revalidateApprovalSurfaces(pharmacyId: string, slug: string) {
  revalidatePath("/");
  revalidatePath("/pharmacies");
  revalidatePath(`/pharmacies/${slug}`);
  revalidatePath(`/p/${slug}`);
  revalidatePath("/medicines");
  revalidatePath("/services");
  revalidatePath("/search");
  revalidatePath("/prescription");
  revalidatePath("/refill");
  revalidatePath("/platform");
  revalidatePath("/platform/applications");
  revalidatePath("/platform/pharmacies");
  revalidatePath(`/platform/pharmacies/${pharmacyId}`);
  revalidatePath(`/platform/pharmacies/${pharmacyId}/verification`);
  revalidatePath("/admin");
  revalidatePath("/admin/setup");
  revalidatePath("/onboard");
  revalidatePath("/onboard/billing");
}

async function approvePharmacyForSetup(formData: FormData): Promise<ReviewActionState> {
  const reviewer = await requirePlatformAction(["super_admin"], { stepUp: true });
  const pharmacyId = text(formData, "pharmacyId");
  const notes = text(formData, "notes");

  if (!pharmacyId) return { error: "Missing pharmacy application." };

  const readiness = await loadApprovalReadiness(pharmacyId);
  if (!readiness.ready) {
    const missing = [...readiness.profileMissing, ...readiness.checklistMissing];
    return { error: `Approval blocked. Complete mandatory pharmacy verification first: ${missing.join("; ")}.` };
  }

  let pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
  if (!pharmacy) return { error: "Pharmacy not found." };

  if (pharmacy.status === "active" && pharmacy.listed && pharmacy.verifiedAt && pharmacy.setupCompletedAt) {
    return { success: "This pharmacy is already verified, fully set up and visible on the public network." };
  }

  if (!["submitted", "under_review", "approved"].includes(pharmacy.status)) {
    return { error: "Only a submitted, under-review or already-approved pharmacy can be approved." };
  }

  const verificationFee = await prismaUnscoped.invoice.findUnique({ where: { number: `KYP-${pharmacyId}` } });
  if (verificationFee?.status !== "paid") {
    return { error: "Verification fee must be paid or waived before approval." };
  }

  const verifiedAt = pharmacy.verifiedAt ?? new Date();

  await prismaUnscoped.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM pharmacies WHERE id = ${pharmacyId}::uuid FOR UPDATE`;
    const latest = await tx.pharmacy.findUniqueOrThrow({ where: { id: pharmacyId } });
    if (!["submitted", "under_review", "approved"].includes(latest.status)) {
      throw new Error("The pharmacy application changed while it was being approved. Refresh and review it again.");
    }

    await tx.pharmacy.update({
      where: { id: pharmacyId },
      data: {
        status: "approved",
        listed: false,
        verifiedAt: latest.verifiedAt ?? verifiedAt,
        verifiedById: latest.verifiedById ?? reviewer.id,
        verificationNotes: notes || latest.verificationNotes,
        rejectionReason: null,
        goLiveAt: null,
        setupCompletedAt: null,
      },
    });

    if (latest.status !== "approved") {
      await tx.pharmacyOnboardingEvent.create({
        data: {
          pharmacyId,
          actorId: reviewer.id,
          type: "approved",
          message: notes || "Regulatory verification passed — guided pharmacy setup unlocked",
          meta: { source: "platform_verification_approval", publicListingDeferred: true },
        },
      });
    }
  });

  await provisionTenant(pharmacyId, reviewer.id);
  const monthlyInvoice = await startPharmacyService(pharmacyId);
  const subscription = await prismaUnscoped.subscription.findFirst({
    where: { pharmacyId, status: { not: "cancelled" } },
    orderBy: { createdAt: "desc" },
  });

  const lifecycleStatus =
    subscription?.status === "active"
      ? "active"
      : subscription?.status === "trialing"
        ? "trial"
        : subscription?.status === "past_due"
          ? "past_due"
          : "onboarding";

  pharmacy = await prismaUnscoped.pharmacy.update({
    where: { id: pharmacyId },
    data: { status: "approved", listed: false, goLiveAt: null, setupCompletedAt: null, lifecycleStatus },
  });

  await recordAuditRequired({
    actorId: reviewer.id,
    action: "pharmacy.approve_for_setup",
    resource: "pharmacy",
    resourceId: pharmacyId,
    tenantId: pharmacyId,
    reason: notes || null,
    details: {
      status: "approved",
      listed: false,
      setupCompleted: false,
      monthlyInvoiceId: monthlyInvoice.id,
      monthlyInvoiceStatus: monthlyInvoice.status,
      subscriptionStatus: subscription?.status ?? null,
    },
  });

  const email = await notifyOwnerPharmacyIsApproved({
    pharmacyId,
    pharmacyName: pharmacy.name,
    ownerUserId: pharmacy.ownerUserId,
    pharmacyEmail: pharmacy.email,
    notes,
    monthlyAmountKes: Number(monthlyInvoice.totalKes),
    monthlyInvoiceStatus: monthlyInvoice.status,
  });

  await prismaUnscoped.pharmacyOnboardingEvent.create({
    data: {
      pharmacyId,
      actorId: reviewer.id,
      type: "approval_email_delivery",
      message:
        email.status === "sent" || email.status === "delivered"
          ? `Approval/setup email sent to ${email.recipient}.`
          : `Approval/setup email ${email.status}${email.recipient ? ` for ${email.recipient}` : ""}.`,
      meta: {
        recipient: email.recipient,
        status: email.status,
        provider: email.provider ?? null,
        providerMessageId: email.providerMessageId ?? null,
        error: email.error ?? null,
      },
    },
  });

  if (email.status === "failed" || email.status === "pending") {
    console.error("[pharmacy-approval] approval email not confirmed", {
      pharmacyId,
      status: email.status,
      recipient: email.recipient,
      error: email.error,
    });
  }

  revalidateApprovalSurfaces(pharmacyId, pharmacy.slug);

  const emailSummary =
    email.status === "sent" || email.status === "delivered"
      ? ` Setup email sent to ${email.recipient}.`
      : " Pharmacy approved, but the setup email has not been confirmed yet. The owner can still continue setup from the dashboard.";

  return {
    success: `Approved for guided setup. The pharmacy remains unlisted until the owner completes setup and publishes it.${emailSummary}`,
  };
}

export async function safeReviewPharmacyAction(
  prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  if (text(formData, "decision") !== "approve") {
    return reviewPharmacyAction(prev, formData);
  }

  try {
    return await approvePharmacyForSetup(formData);
  } catch (error) {
    console.error("[pharmacy-approval] approve for setup", error);
    return {
      error: publicErrorMessage(
        error,
        "We couldn't complete pharmacy approval right now. No approval state was changed; refresh and try again.",
      ),
    };
  }
}
