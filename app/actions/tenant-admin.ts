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
  const env = String(formData.get("darajaEnv") || "sandbox").trim();
  const shortcodeType = String(formData.get("darajaShortcodeType") || "paybill").trim() === "till" ? "till" : "paybill";

  if (shortcode) {
    await saveTenantDaraja(pharmacyId, {
      consumerKey: key || undefined,
      consumerSecret: secret || undefined,
      passkey: passkey || undefined,
      shortcode,
      shortcodeType,
      env,
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
  revalidatePath("/admin/settings/payments");
  redirect("/admin/settings/integrations");
}

export type PaymentSettingsActionState = {
  error?: string;
  success?: string;
};

export async function saveTenantPaymentSettingsAction(
  _prev: PaymentSettingsActionState,
  formData: FormData,
): Promise<PaymentSettingsActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "You must be signed in." };

  const pharmacyId = String(formData.get("pharmacyId") || user.activePharmacyId || "");
  if (!pharmacyId) return { error: "Active pharmacy not found." };

  const can =
    user.platformAdmin ||
    user.memberships.some(
      (membership) =>
        membership.pharmacyId === pharmacyId &&
        (membership.role === "owner" || membership.role === "manager"),
    );
  if (!can) return { error: "Only owners and managers can modify payment credentials." };

  if (!user.platformAdmin) {
    try {
      await assertPharmacyWorkspaceOperable(pharmacyId);
    } catch {
      return { error: "Pharmacy workspace is currently restricted or paused." };
    }
  }

  const shortcode = String(formData.get("shortcode") || "").trim();
  const shortcodeType = String(formData.get("shortcodeType") || "paybill").trim() === "till" ? "till" : "paybill";
  const env = String(formData.get("environment") || "sandbox").trim() === "production" ? "production" : "sandbox";
  const consumerKey = String(formData.get("consumerKey") || "").trim();
  const consumerSecret = String(formData.get("consumerSecret") || "").trim();
  const passkey = String(formData.get("passkey") || "").trim();

  if (!shortcode) return { error: "Please enter your shortcode." };

  try {
    const { saveTenantDaraja } = await import("@/app/lib/platform/integrations");
    const { recordAuditRequired } = await import("@/app/lib/platform/audit");

    await saveTenantDaraja(pharmacyId, {
      shortcode,
      shortcodeType,
      env,
      consumerKey: consumerKey || undefined,
      consumerSecret: consumerSecret || undefined,
      passkey: passkey || undefined,
    });

    await recordAuditRequired({
      actorId: user.id,
      action: "integrations.payments.update",
      resource: "pharmacy_payment_settings",
      tenantId: pharmacyId,
      reason: `M-Pesa payment integration updated (${shortcodeType.toUpperCase()}, ${env})`,
    });

    revalidatePath("/admin/settings/payments");
    revalidatePath("/admin/settings/integrations");
    revalidatePath("/admin/setup");
    revalidatePath(`/pharmacies`);

    return { success: "Payment settings saved securely." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save payment settings." };
  }
}

export async function testTenantPaymentConnectionAction(
  _prev: PaymentSettingsActionState,
  formData: FormData,
): Promise<PaymentSettingsActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "You must be signed in." };

  const pharmacyId = String(formData.get("pharmacyId") || user.activePharmacyId || "");
  if (!pharmacyId) return { error: "Active pharmacy not found." };

  const can =
    user.platformAdmin ||
    user.memberships.some(
      (membership) =>
        membership.pharmacyId === pharmacyId &&
        (membership.role === "owner" || membership.role === "manager"),
    );
  if (!can) return { error: "Only owners and managers can test payment connections." };

  try {
    const { testTenantDarajaConnection } = await import("@/app/lib/platform/integrations");
    const { recordAuditRequired } = await import("@/app/lib/platform/audit");

    const result = await testTenantDarajaConnection(pharmacyId);

    await recordAuditRequired({
      actorId: user.id,
      action: "integrations.payments.test",
      resource: "pharmacy_payment_settings",
      tenantId: pharmacyId,
      reason: result.ok ? "Daraja connection test passed" : `Daraja connection test failed: ${result.error}`,
    });

    revalidatePath("/admin/settings/payments");
    revalidatePath("/admin/settings/integrations");

    if (result.ok) {
      return { success: result.message || "Connection tested successfully." };
    }
    return { error: result.error || "Connection test failed." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not test connection." };
  }
}

export async function disconnectTenantPaymentAction(
  _prev: PaymentSettingsActionState,
  formData: FormData,
): Promise<PaymentSettingsActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "You must be signed in." };

  const pharmacyId = String(formData.get("pharmacyId") || user.activePharmacyId || "");
  if (!pharmacyId) return { error: "Active pharmacy not found." };

  const can =
    user.platformAdmin ||
    user.memberships.some(
      (membership) =>
        membership.pharmacyId === pharmacyId &&
        (membership.role === "owner" || membership.role === "manager"),
    );
  if (!can) return { error: "Only owners and managers can disconnect payment integrations." };

  try {
    const { disconnectTenantDaraja } = await import("@/app/lib/platform/integrations");
    const { recordAuditRequired } = await import("@/app/lib/platform/audit");

    await disconnectTenantDaraja(pharmacyId);

    await recordAuditRequired({
      actorId: user.id,
      action: "integrations.payments.disconnect",
      resource: "pharmacy_payment_settings",
      tenantId: pharmacyId,
      reason: "M-Pesa payment integration disconnected",
    });

    revalidatePath("/admin/settings/payments");
    revalidatePath("/admin/settings/integrations");
    revalidatePath("/admin/setup");

    return { success: "Online payments have been disconnected." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not disconnect payments." };
  }
}

export async function goLiveAction(formData?: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/onboard");

  const formPharmacyId = formData?.get("pharmacyId") ? String(formData.get("pharmacyId")) : null;
  const pharmacyId =
    formPharmacyId ||
    user.activePharmacyId ||
    user.memberships.find((m) => m.role === "owner" || m.role === "manager")?.pharmacyId;
  if (!pharmacyId) redirect("/onboard");

  const pharmacy = await prismaUnscoped.pharmacy.findUnique({
    where: { id: pharmacyId },
  });
  if (!pharmacy) redirect("/onboard");

  const can =
    user.platformAdmin ||
    pharmacy.ownerUserId === user.id ||
    user.memberships.some(
      (membership) =>
        membership.pharmacyId === pharmacy.id &&
        (membership.role === "owner" || membership.role === "manager"),
    );
  if (!can) redirect("/onboard");

  if (!user.platformAdmin) {
    try {
      await assertPharmacyWorkspaceOperable(pharmacy.id);
    } catch {
      redirect("/admin/access-paused");
    }
  }

  if (pharmacy.status !== "approved" && pharmacy.status !== "active") {
    redirect(`/onboard?stage=setup&pharmacyId=${pharmacy.id}`);
  }

  const readiness = await loadPharmacySetup(pharmacy.id);
  if (!readiness.ready) {
    redirect(`/onboard?stage=setup&pharmacyId=${pharmacy.id}`);
  }

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
  revalidatePath("/onboard");
  redirect(`/onboard?stage=complete&pharmacyId=${pharmacy.id}`);
}
