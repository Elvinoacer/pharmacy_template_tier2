"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prismaUnscoped } from "@/app/lib/db";
import { getSessionUser, requirePlatformAdmin, writeAuditLog } from "@/app/lib/auth";
import { STAFF_PHARMACY_COOKIE } from "@/app/lib/tenant-context";

async function actor() {
  const user = await getSessionUser();
  return requirePlatformAdmin(user);
}

export async function reviewPharmacyAction(formData: FormData): Promise<void> {
  try {
    const user = await actor();
    const pharmacyId = String(formData.get("pharmacyId") || "");
    const decision = String(formData.get("decision") || "");
    const notes = String(formData.get("notes") || "").trim();
    const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) throw new Error("Pharmacy not found.");

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
      if (!notes) throw new Error("A reason is required to reject.");
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
      if (!notes) throw new Error("Tell the owner what is missing.");
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
      throw new Error("Unknown decision.");
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
  } catch (err) {
    throw err instanceof Error ? err : new Error("Review failed.");
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
  } catch (err) {
    throw err instanceof Error ? err : new Error("Update failed.");
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
  // Marker so the admin shell can show an impersonation banner with an exit.
  jar.set("aether_impersonation", pharmacyId, {
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

/** Leave support view: drop the impersonated tenant cookies, return to /platform. */
export async function exitImpersonationAction(): Promise<void> {
  await actor();
  const jar = await cookies();
  jar.delete(STAFF_PHARMACY_COOKIE);
  jar.delete("aether_impersonation");
  redirect("/platform");
}

/**
 * Super-admin tenant edit: identity + contact + licence fields.
 * Slug changes are guarded for format and uniqueness.
 */
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

/**
 * Suspend a tenant with a recorded reason (onboarding timeline + audit).
 */
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

/**
 * User administration: activate / suspend a user and grant/revoke
 * platform-admin. Self-lockout is blocked.
 */
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
  // Force re-authentication of any live sessions for suspended users.
  if (status === "suspended" || status === "inactive") {
    await prismaUnscoped.session.deleteMany({ where: { userId } }).catch(() => {});
  }

  await writeAuditLog(admin.id, "user.update", "user", userId, { ...data }).catch(() => {});

  revalidatePath(back);
}
