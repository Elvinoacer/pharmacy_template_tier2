"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { STAFF_PHARMACY_COOKIE } from "@/app/lib/tenant-context";
import { loadPharmacySetup } from "@/app/lib/services/pharmacy-setup";
import { assertPharmacyWorkspaceOperable } from "@/app/lib/platform/tenant-access";

export async function switchPharmacyAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  const pharmacyId = String(formData.get("pharmacyId") || "");
  const allowed =
    user.platformAdmin || user.memberships.some((membership) => membership.pharmacyId === pharmacyId);
  if (!allowed) redirect("/admin/select");

  const jar = await cookies();
  jar.set(STAFF_PHARMACY_COOKIE, pharmacyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/admin");
  redirect("/admin");
}

export async function saveTenantIntegrationsAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user?.activePharmacyId) redirect("/admin");
  const pharmacyId = user.activePharmacyId;
  const can =
    user.platformAdmin ||
    user.memberships.some(
      (membership) =>
        membership.pharmacyId === pharmacyId &&
        (membership.role === "owner" || membership.role === "manager"),
    );
  if (!can) redirect("/admin/settings/integrations");

  if (!user.platformAdmin) {
    try {
      await assertPharmacyWorkspaceOperable(pharmacyId);
    } catch {
      redirect("/admin/access-paused");
    }
  }

  const { saveTenantDaraja } = await import("@/app/lib/platform/integrations");
  const { recordAuditRequired } = await import("@/app/lib/platform/audit");

  const shortcode = String(formData.get("darajaShortcode") || "").trim();
  const key = String(formData.get("darajaConsumerKey") || "").trim();
  const secret = String(formData.get("darajaConsumerSecret") || "").trim();
  const passkey = String(formData.get("darajaPasskey") || "").trim();
  if (shortcode && key && secret && passkey) {
    await saveTenantDaraja(pharmacyId, {
      consumerKey: key,
      consumerSecret: secret,
      passkey,
      shortcode,
    });
  }

  await prismaUnscoped.pharmacyIntegration.upsert({
    where: { pharmacyId },
    update: {
      emailFromOverride: String(formData.get("emailFromOverride") || "").trim() || null,
      supportEmailOverride: String(formData.get("supportEmailOverride") || "").trim() || null,
      supportPhoneOverride: String(formData.get("supportPhoneOverride") || "").trim() || null,
    },
    create: {
      pharmacyId,
      emailFromOverride: String(formData.get("emailFromOverride") || "").trim() || null,
      supportEmailOverride: String(formData.get("supportEmailOverride") || "").trim() || null,
      supportPhoneOverride: String(formData.get("supportPhoneOverride") || "").trim() || null,
    },
  });

  await recordAuditRequired({
    actorId: user.id,
    action: "integrations.update",
    resource: "pharmacy_integration",
    tenantId: pharmacyId,
    reason: "tenant credentials updated",
  });
  revalidatePath("/admin/settings/integrations");
  redirect("/admin/settings/integrations");
}

export async function goLiveAction() {
  const user = await getSessionUser();
  if (!user?.activePharmacyId) redirect("/admin");

  const pharmacy = await prismaUnscoped.pharmacy.findUnique({
    where: { id: user.activePharmacyId },
  });
  if (!pharmacy) redirect("/admin");

  const can =
    user.platformAdmin ||
    user.memberships.some(
      (membership) =>
        membership.pharmacyId === pharmacy.id &&
        (membership.role === "owner" || membership.role === "manager"),
    );
  if (!can) redirect("/admin");

  if (!user.platformAdmin) {
    try {
      await assertPharmacyWorkspaceOperable(pharmacy.id);
    } catch {
      redirect("/admin/access-paused");
    }
  }

  if (pharmacy.status !== "approved" && pharmacy.status !== "active") redirect("/admin/setup");

  const readiness = await loadPharmacySetup(pharmacy.id);
  if (!readiness.ready) redirect("/admin/setup");

  const completedAt = pharmacy.setupCompletedAt ?? new Date();
  await prismaUnscoped.$transaction([
    prismaUnscoped.pharmacy.update({
      where: { id: pharmacy.id },
      data: {
        status: "active",
        listed: true,
        lifecycleStatus: "active",
        goLiveAt: pharmacy.goLiveAt ?? completedAt,
        setupCompletedAt: completedAt,
      },
    }),
    prismaUnscoped.pharmacyOnboardingEvent.create({
      data: {
        pharmacyId: pharmacy.id,
        actorId: user.id,
        type: "setup_completed",
        message: "Guided pharmacy setup completed and public listing enabled.",
        meta: { source: "guided_setup" },
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/pharmacies");
  revalidatePath(`/pharmacies/${pharmacy.slug}`);
  revalidatePath(`/p/${pharmacy.slug}`);
  revalidatePath("/medicines");
  revalidatePath("/services");
  revalidatePath("/admin");
  revalidatePath("/admin/setup");
  redirect("/admin");
}
