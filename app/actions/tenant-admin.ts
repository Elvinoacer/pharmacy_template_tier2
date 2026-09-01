"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { STAFF_PHARMACY_COOKIE } from "@/app/lib/tenant-context";

export async function switchPharmacyAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  const pharmacyId = String(formData.get("pharmacyId") || "");
  const allowed =
    user.platformAdmin || user.memberships.some((m) => m.pharmacyId === pharmacyId);
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
      (m) => m.pharmacyId === pharmacyId && (m.role === "owner" || m.role === "manager"),
    );
  if (!can) redirect("/admin/settings/integrations");

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
      (m) => m.pharmacyId === pharmacy.id && (m.role === "owner" || m.role === "manager"),
    );
  if (!can) redirect("/admin");
  if (pharmacy.status !== "approved" && pharmacy.status !== "active") redirect("/admin/setup");

  await prismaUnscoped.pharmacy.update({
    where: { id: pharmacy.id },
    data: {
      status: "active",
      listed: true,
      goLiveAt: pharmacy.goLiveAt ?? new Date(),
      setupCompletedAt: pharmacy.setupCompletedAt ?? new Date(),
    },
  });
  revalidatePath("/");
  revalidatePath("/admin/setup");
  redirect("/admin");
}
