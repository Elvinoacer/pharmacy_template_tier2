"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prismaUnscoped } from "@/app/lib/db";
import { getSessionUser, requirePlatformAdmin, writeAuditLog } from "@/app/lib/auth";
import { STAFF_PHARMACY_COOKIE } from "@/app/lib/tenant-context";

export type PlatformActionState = { error?: string; success?: string };

async function actor() {
  const user = await getSessionUser();
  return requirePlatformAdmin(user);
}

export async function reviewPharmacyAction(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
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
    } else if (decision === "reject") {
      if (!notes) return { error: "A reason is required to reject." };
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
    } else if (decision === "needs_info") {
      if (!notes) return { error: "Tell the owner what is missing." };
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
    } else if (decision === "under_review") {
      await prismaUnscoped.pharmacy.update({
        where: { id: pharmacyId },
        data: { status: "under_review" },
      });
    } else {
      return { error: "Unknown decision." };
    }

    await writeAuditLog(
      user.id,
      `pharmacy.${decision}`,
      "pharmacy",
      pharmacyId,
      { notes },
    ).catch(() => {});

    revalidatePath("/platform");
    revalidatePath(`/platform/pharmacies/${pharmacyId}`);
    return { success: `Marked ${decision.replace("_", " ")}.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Review failed." };
  }
}

export async function setPharmacyLiveAction(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  try {
    const user = await actor();
    const pharmacyId = String(formData.get("pharmacyId") || "");
    const listed = String(formData.get("listed") || "") === "true";
    const featured = String(formData.get("featured") || "") === "true";
    const suspend = String(formData.get("suspend") || "") === "true";
    const restore = String(formData.get("restore") || "") === "true";

    const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) return { error: "Pharmacy not found." };

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
    return { success: "Updated." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Update failed." };
  }
}

export async function impersonatePharmacyAction(formData: FormData): Promise<void> {
  const user = await actor();
  const pharmacyId = String(formData.get("pharmacyId") || "");
  const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
  if (!pharmacy) throw new Error("Pharmacy not found");

  const jar = await cookies();
  jar.set(STAFF_PHARMACY_COOKIE, pharmacyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  await writeAuditLog(
    user.id,
    "pharmacy.support_view",
    "pharmacy",
    pharmacyId,
  ).catch(() => {});
  redirect("/admin");
}
