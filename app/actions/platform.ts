"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prismaUnscoped } from "@/app/lib/db";
import { getSessionUser, requirePlatformAdmin, writeAuditLog } from "@/app/lib/auth";
import { sendDelivery } from "@/app/lib/services/delivery";

export type ReviewActionState = {
  error?: string;
  success?: string;
};

async function actor() {
  const user = await getSessionUser();
  return requirePlatformAdmin(user);
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

async function notifyOwnerOfDecision(opts: {
  pharmacyId: string;
  pharmacyName: string;
  decision: "approve" | "reject" | "needs_info";
  notes: string;
  ownerUserId: string | null;
  pharmacyEmail: string | null;
}) {
  let toEmail = opts.pharmacyEmail?.trim() || null;
  let ownerName = "there";

  if (opts.ownerUserId) {
    const owner = await prismaUnscoped.user.findUnique({
      where: { id: opts.ownerUserId },
      select: {
        email: true,
        profile: { select: { fullName: true } },
      },
    });
    if (owner?.email) toEmail = owner.email;
    if (owner?.profile?.fullName) ownerName = owner.profile.fullName.split(" ")[0] || ownerName;
  }

  if (!toEmail) return;

  const base = appUrl();
  let subject = "";
  let body = "";

  if (opts.decision === "approve") {
    subject = `${opts.pharmacyName} has been approved — next steps`;
    body = [
      `Hi ${ownerName},`,
      "",
      `Great news — **${opts.pharmacyName}** has been verified and approved to join the Aether Pharmacy Network.`,
      opts.notes ? `\nReviewer note: ${opts.notes}` : "",
      "",
      "### What to do next",
      "1. Sign in and open **Admin → Setup** to finish the go-live checklist.",
      "2. Confirm hours, contact details, and catalogue basics.",
      "3. List your pharmacy when you are ready to appear on the marketplace.",
      "",
      `[Continue to setup](${base}/admin/setup)`,
      "",
      "Welcome aboard.",
      "— Aether Network",
    ]
      .filter(Boolean)
      .join("\n");
  } else if (opts.decision === "reject") {
    subject = `Update on ${opts.pharmacyName} application`;
    body = [
      `Hi ${ownerName},`,
      "",
      `We reviewed the application for **${opts.pharmacyName}** and are unable to approve it at this time.`,
      "",
      `**Reason:** ${opts.notes || "Not specified."}`,
      "",
      "If you believe this was in error, reply to this email or contact support with any additional documentation.",
      "",
      "— Aether Network",
    ].join("\n");
  } else {
    subject = `More information needed for ${opts.pharmacyName}`;
    body = [
      `Hi ${ownerName},`,
      "",
      `We need a little more information before we can complete verification for **${opts.pharmacyName}**.`,
      "",
      `**What we need:** ${opts.notes || "Please review your application and update the missing details."}`,
      "",
      "You can edit and resubmit from the onboarding flow:",
      `[Open onboarding](${base}/onboard)`,
      "",
      "— Aether Network",
    ].join("\n");
  }

  await sendDelivery({
    channel: "email",
    purpose: "transactional",
    recipient: { email: toEmail },
    subject,
    body,
  }).catch((err) => {
    console.error("[platform] owner decision email failed", err);
  });
}

export async function reviewPharmacyAction(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  try {
    const user = await actor();
    const pharmacyId = String(formData.get("pharmacyId") || "");
    const decision = String(formData.get("decision") || "");
    const notes = String(formData.get("notes") || "").trim();
    const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) return { error: "Pharmacy not found." };

    if (decision === "approve") {
      await prismaUnscoped.pharmacy.update({
        where: { id: pharmacyId },
        data: {
          status: "approved",
          verifiedAt: new Date(),
          verifiedById: user.id,
          verificationNotes: notes || pharmacy.verificationNotes,
          rejectionReason: null,
        },
      });
      await prismaUnscoped.pharmacyOnboardingEvent.create({
        data: {
          pharmacyId,
          actorId: user.id,
          type: "approved",
          message: notes || "Licence verified — pharmacy approved",
        },
      });
      const { provisionTenant } = await import("@/app/lib/platform/provision");
      await provisionTenant(pharmacyId, user.id);
      await notifyOwnerOfDecision({
        pharmacyId,
        pharmacyName: pharmacy.name,
        decision: "approve",
        notes,
        ownerUserId: pharmacy.ownerUserId,
        pharmacyEmail: pharmacy.email,
      });
    } else if (decision === "reject") {
      if (!notes) return { error: "Add a reason before rejecting." };
      await prismaUnscoped.pharmacy.update({
        where: { id: pharmacyId },
        data: { status: "rejected", rejectionReason: notes, listed: false },
      });
      await prismaUnscoped.pharmacyOnboardingEvent.create({
        data: {
          pharmacyId,
          actorId: user.id,
          type: "rejected",
          message: notes,
        },
      });
      await notifyOwnerOfDecision({
        pharmacyId,
        pharmacyName: pharmacy.name,
        decision: "reject",
        notes,
        ownerUserId: pharmacy.ownerUserId,
        pharmacyEmail: pharmacy.email,
      });
    } else if (decision === "needs_info") {
      if (!notes) return { error: "Tell the owner what information is missing." };
      await prismaUnscoped.pharmacy.update({
        where: { id: pharmacyId },
        data: { status: "needs_info", verificationNotes: notes },
      });
      await prismaUnscoped.pharmacyOnboardingEvent.create({
        data: {
          pharmacyId,
          actorId: user.id,
          type: "needs_info",
          message: notes,
        },
      });
      await notifyOwnerOfDecision({
        pharmacyId,
        pharmacyName: pharmacy.name,
        decision: "needs_info",
        notes,
        ownerUserId: pharmacy.ownerUserId,
        pharmacyEmail: pharmacy.email,
      });
    } else if (decision === "under_review") {
      await prismaUnscoped.pharmacy.update({
        where: { id: pharmacyId },
        data: { status: "under_review" },
      });
      await prismaUnscoped.pharmacyOnboardingEvent.create({
        data: {
          pharmacyId,
          actorId: user.id,
          type: "under_review",
          message: notes || "Application marked under review",
        },
      });
    } else {
      return { error: "Choose a verification decision." };
    }

    await writeAuditLog(
      user.id,
      `pharmacy.${decision}`,
      "pharmacy",
      pharmacyId,
      { notes },
    ).catch(() => {});

    revalidatePath("/platform");
    revalidatePath("/platform/applications");
    revalidatePath("/platform/pharmacies");
    revalidatePath(`/platform/pharmacies/${pharmacyId}`);
    revalidatePath("/onboard");

    const labels: Record<string, string> = {
      approve: "Approved — owner notified by email.",
      reject: "Rejected — owner notified with your reason.",
      needs_info: "Marked needs info — owner notified.",
      under_review: "Marked under review.",
    };
    return { success: labels[decision] || "Decision saved." };
  } catch (err) {
    console.error("[platform] review", err);
    return { error: err instanceof Error ? err.message : "Review failed. Try again." };
  }
}

export async function setPharmacyLiveAction(formData: FormData): Promise<void> {
  try {
    const user = await actor();
    const pharmacyId = String(formData.get("pharmacyId") || "");
    const listed = String(formData.get("listed") || "") === "true";
    const featured = String(formData.get("featured") || "") === "true";
    const suspend = String(formData.get("suspend") || "") === "true";
    const restore = String(formData.get("restore") || "") === "true";

    const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) throw new Error("Pharmacy not found.");

    if (suspend) {
      await prismaUnscoped.pharmacy.update({
        where: { id: pharmacyId },
        data: { status: "suspended", listed: false },
      });
    } else if (restore) {
      await prismaUnscoped.pharmacy.update({
        where: { id: pharmacyId },
        data: { status: "active", listed: true, goLiveAt: pharmacy.goLiveAt ?? new Date() },
      });
    } else {
      await prismaUnscoped.pharmacy.update({
        where: { id: pharmacyId },
        data: {
          listed,
          featured,
          ...(listed && pharmacy.status === "approved"
            ? { status: "active", goLiveAt: pharmacy.goLiveAt ?? new Date() }
            : {}),
        },
      });
    }

    await writeAuditLog(
      user.id,
      "pharmacy.flags",
      "pharmacy",
      pharmacyId,
      { listed, featured, suspend, restore },
    ).catch(() => {});

    revalidatePath("/");
    revalidatePath("/platform");
    revalidatePath(`/platform/pharmacies/${pharmacyId}`);
  } catch (err) {
    throw err instanceof Error ? err : new Error("Update failed.");
  }
}

export async function impersonatePharmacyAction(formData: FormData): Promise<void> {
  const user = await actor();
  const pharmacyId = String(formData.get("pharmacyId") || "");
  const reason = String(formData.get("reason") || "").trim();
  const ticketRef = String(formData.get("ticketRef") || "").trim();
  const mode = String(formData.get("mode") || "read_only") === "act_as_tenant" ? "act_as_tenant" : "read_only";
  const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
  if (!pharmacy) throw new Error("Pharmacy not found");
  if (!reason) throw new Error("A support reason is required before entering a tenant.");

  const { startSupportSession } = await import("@/app/lib/platform/support-session");
  await startSupportSession({
    adminId: user.id,
    pharmacyId,
    reason,
    ticketRef,
    mode,
    hours: 2,
  });
  redirect("/admin");
}

export async function exitImpersonationAction(): Promise<void> {
  const user = await actor();
  const { endSupportSession } = await import("@/app/lib/platform/support-session");
  await endSupportSession(user.id);
  redirect("/platform");
}

export async function updatePharmacyAction(formData: FormData): Promise<void> {
  const user = await actor();
  const pharmacyId = String(formData.get("pharmacyId") || "");
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const legalName = String(formData.get("legalName") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim().toLowerCase() || null;
  const whatsapp = String(formData.get("whatsapp") || "").trim() || null;
  const city = String(formData.get("city") || "").trim() || null;
  const county = String(formData.get("county") || "").trim() || null;
  const licenseNumber = String(formData.get("licenseNumber") || "").trim() || null;

  if (!pharmacyId) throw new Error("Missing pharmacy.");
  if (!name) throw new Error("Name is required.");
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(slug)) {
    throw new Error("Slug must be 2-61 chars: lowercase letters, digits, dashes.");
  }

  const existing = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
  if (!existing) throw new Error("Pharmacy not found.");

  if (slug !== existing.slug) {
    const clash = await prismaUnscoped.pharmacy.findUnique({ where: { slug } });
    if (clash) throw new Error(`Slug "/p/${slug}" is already taken.`);
  }

  await prismaUnscoped.pharmacy.update({
    where: { id: pharmacyId },
    data: { name, slug, legalName, phone, email, whatsapp, city, county, licenseNumber },
  });

  await writeAuditLog(user.id, "pharmacy.update", "pharmacy", pharmacyId, {
    fields: { name, slug, legalName, phone, email, whatsapp, city, county, licenseNumber },
  }).catch(() => {});

  revalidatePath("/platform");
  revalidatePath("/platform/pharmacies");
  revalidatePath(`/platform/pharmacies/${pharmacyId}`);
}

export async function suspendPharmacyAction(formData: FormData): Promise<void> {
  const user = await actor();
  const pharmacyId = String(formData.get("pharmacyId") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!reason) throw new Error("A suspension reason is required.");

  const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
  if (!pharmacy) throw new Error("Pharmacy not found.");

  await prismaUnscoped.pharmacy.update({
    where: { id: pharmacyId },
    data: { status: "suspended", listed: false },
  });
  await prismaUnscoped.pharmacyOnboardingEvent.create({
    data: {
      pharmacyId,
      actorId: user.id,
      type: "suspended",
      message: `Suspended: ${reason}`,
    },
  });
  await writeAuditLog(user.id, "pharmacy.suspended", "pharmacy", pharmacyId, { reason }).catch(() => {});

  revalidatePath("/platform");
  revalidatePath(`/platform/pharmacies/${pharmacyId}`);
}

export async function updateUserAction(formData: FormData): Promise<void> {
  const admin = await actor();
  const userId = String(formData.get("userId") || "");
  const status = String(formData.get("status") || "").trim();
  const platformAdmin = String(formData.get("platformAdmin") || "").trim();
  const back = String(formData.get("back") || "/platform/users");

  if (!userId) throw new Error("Missing user.");
  if (userId === admin.id) throw new Error("You cannot modify your own account here.");

  const target = await prismaUnscoped.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("User not found.");

  const data: { status?: "active" | "inactive" | "suspended"; platformAdmin?: boolean } = {};
  if (status === "active" || status === "inactive" || status === "suspended") {
    data.status = status;
  }
  if (platformAdmin === "grant") data.platformAdmin = true;
  if (platformAdmin === "revoke") data.platformAdmin = false;

  if (Object.keys(data).length === 0) throw new Error("Nothing to change.");

  await prismaUnscoped.user.update({ where: { id: userId }, data });
  if (status === "suspended" || status === "inactive") {
    await prismaUnscoped.session.deleteMany({ where: { userId } }).catch(() => {});
  }

  await writeAuditLog(admin.id, "user.update", "user", userId, { ...data }).catch(() => {});

  revalidatePath(back);
}
