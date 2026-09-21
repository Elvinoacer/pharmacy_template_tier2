"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { publicErrorMessage } from "@/app/lib/public-error";
import { withPharmacy } from "@/app/lib/tenant-context";
import { createService } from "@/app/lib/services/pharmacy-services";
import { loadLatestVerificationProfile } from "@/app/lib/services/pharmacy-verification";
import { SETUP_MEDICINES_DEFERRED_EVENT } from "@/app/lib/services/pharmacy-setup";

type SetupPharmacy = NonNullable<Awaited<ReturnType<typeof loadSetupPharmacy>>>;

async function loadSetupPharmacy(explicitPharmacyId?: string | null) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/onboard");

  const pharmacyId =
    explicitPharmacyId ||
    user.activePharmacyId ||
    user.memberships.find((m) => m.role === "owner" || m.role === "manager")?.pharmacyId;
  if (!pharmacyId) redirect("/onboard");

  const pharmacy = await prismaUnscoped.pharmacy.findUnique({
    where: { id: pharmacyId },
    include: { owner: { select: { email: true } } },
  });
  if (!pharmacy) redirect("/onboard");

  const canManage =
    user.platformAdmin ||
    pharmacy.ownerUserId === user.id ||
    user.memberships.some(
      (membership) =>
        membership.pharmacyId === pharmacyId &&
        (membership.role === "owner" || membership.role === "manager"),
    );
  if (!canManage) redirect("/onboard");

  if (!["approved", "active"].includes(pharmacy.status) || !pharmacy.verifiedAt) {
    redirect("/onboard");
  }

  return pharmacy;
}

async function syncVerifiedIdentity(pharmacy: SetupPharmacy) {
  const verification = await loadLatestVerificationProfile(pharmacy.id);
  const addressLine1 = verification?.profile.physicalAddress || null;
  const email = pharmacy.email || pharmacy.owner?.email || null;

  return prismaUnscoped.pharmacySettings.upsert({
    where: { pharmacyId: pharmacy.id },
    update: {
      displayName: pharmacy.name,
      phone: pharmacy.phone,
      email,
      whatsapp: pharmacy.whatsapp,
      addressLine1,
      city: pharmacy.city,
      state: pharmacy.county,
      country: pharmacy.country,
      latitude: pharmacy.latitude,
      longitude: pharmacy.longitude,
    },
    create: {
      pharmacyId: pharmacy.id,
      displayName: pharmacy.name,
      phone: pharmacy.phone,
      email,
      whatsapp: pharmacy.whatsapp,
      addressLine1,
      city: pharmacy.city,
      state: pharmacy.county,
      country: pharmacy.country,
      latitude: pharmacy.latitude,
      longitude: pharmacy.longitude,
    },
  });
}

function clean(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function formatClock(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return value;
  const [hoursRaw, minutes] = value.split(":");
  const hours = Number(hoursRaw);
  const suffix = hours >= 12 ? "PM" : "AM";
  const twelve = hours % 12 || 12;
  return `${twelve}:${minutes} ${suffix}`;
}

function range(open: string, close: string) {
  if (!open && !close) return "Closed";
  if (!open || !close || !/^([01]\d|2[0-3]):[0-5]\d$/.test(open) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(close) || close <= open) return null;
  return `${formatClock(open)} – ${formatClock(close)}`;
}

function setupError(step: string, message: string, source?: string): never {
  if (source === "onboard") {
    redirect(`/onboard?stage=setup&setupStep=${step}&error=${encodeURIComponent(message)}`);
  }
  redirect(`/admin/setup?step=${step}&error=${encodeURIComponent(message)}`);
}

export async function saveSetupHoursAction(formData: FormData) {
  const source = clean(formData, "source");
  const pharmacyId = clean(formData, "pharmacyId");
  const pharmacy = await loadSetupPharmacy(pharmacyId);
  const weekday = range(clean(formData, "weekdayOpen"), clean(formData, "weekdayClose"));
  const saturday = range(clean(formData, "saturdayOpen"), clean(formData, "saturdayClose"));
  const sunday = range(clean(formData, "sundayOpen"), clean(formData, "sundayClose"));

  if (!weekday || weekday === "Closed") {
    setupError("hours", "Add your normal Monday to Friday opening hours.", source);
  }
  if (!saturday || !sunday) {
    setupError("hours", "For weekend hours, enter both opening and closing time or leave both blank.", source);
  }

  await syncVerifiedIdentity(pharmacy);
  await prismaUnscoped.pharmacySettings.update({
    where: { pharmacyId: pharmacy.id },
    data: {
      hours: [
        { day: "Monday – Friday", time: weekday },
        { day: "Saturday", time: saturday },
        { day: "Sunday", time: sunday },
      ],
    },
  });

  revalidatePath("/onboard");
  revalidatePath("/admin/setup");
  revalidatePath(`/p/${pharmacy.slug}`);
  if (source === "onboard") {
    redirect(`/onboard?stage=setup&setupStep=medicines&pharmacyId=${pharmacy.id}`);
  }
  redirect("/admin/setup?step=medicines");
}

export async function deferSetupMedicinesAction(formData?: FormData) {
  const pharmacyId = formData ? clean(formData, "pharmacyId") : "";
  const pharmacy = await loadSetupPharmacy(pharmacyId);
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/onboard");
  const source = formData ? clean(formData, "source") : "";

  const existing = await prismaUnscoped.pharmacyOnboardingEvent.findFirst({
    where: { pharmacyId: pharmacy.id, type: SETUP_MEDICINES_DEFERRED_EVENT },
    select: { id: true },
  });

  if (!existing) {
    const medicines = await prismaUnscoped.pharmacyInventory.count({
      where: {
        pharmacyId: pharmacy.id,
        active: true,
        publicListing: true,
        currentStock: { gt: 0 },
        price: { gt: 0 },
      },
    });
    await prismaUnscoped.pharmacyOnboardingEvent.create({
      data: {
        pharmacyId: pharmacy.id,
        actorId: user.id,
        type: SETUP_MEDICINES_DEFERRED_EVENT,
        message: "Medicine catalogue deferred until after pharmacy launch.",
        meta: { source: "guided_setup", medicinesAtDecision: medicines },
      },
    });
  }

  revalidatePath("/onboard");
  revalidatePath("/admin/setup");
  if (source === "onboard") {
    redirect(`/onboard?stage=setup&setupStep=services&pharmacyId=${pharmacy.id}`);
  }
  redirect("/admin/setup?step=services");
}

export async function saveSetupServiceAction(formData: FormData) {
  const source = clean(formData, "source");
  const pharmacyId = clean(formData, "pharmacyId");
  const pharmacy = await loadSetupPharmacy(pharmacyId);
  const title = clean(formData, "title");
  const description = clean(formData, "description");
  const priceRaw = clean(formData, "price");
  const price = priceRaw ? Number(priceRaw) : null;

  if (title.length < 3) setupError("services", "Enter a service name.", source);
  if (description.length < 12) setupError("services", "Add a short description of the service.", source);
  if (price != null && (!Number.isFinite(price) || price <= 0)) {
    setupError("services", "Enter a valid price or leave it blank.", source);
  }

  const short = description.length > 120 ? `${description.slice(0, 117).trimEnd()}…` : description;
  try {
    await withPharmacy(pharmacy.id, () =>
      createService({
        title,
        short,
        description,
        price,
        imageUrl: clean(formData, "imageUrl") || null,
        eligibility: ["before", "after"].includes(clean(formData, "paymentTiming")) ? `[payable:${clean(formData, "paymentTiming")}]` : null,
        active: true,
        bookable: true,
      }),
    );
  } catch (error) {
    console.error("[saveSetupServiceAction]", error);
    setupError(
      "services",
      publicErrorMessage(
        error,
        "We couldn't save this service right now. Review the details and try again.",
      ),
      source,
    );
  }

  revalidatePath("/onboard");
  revalidatePath("/admin/setup");
  revalidatePath("/services");
  if (source === "onboard") {
    redirect(`/onboard?stage=setup&setupStep=profile&pharmacyId=${pharmacy.id}`);
  }
  redirect("/admin/setup?step=profile");
}

export async function saveSetupProfileAction(formData: FormData) {
  const source = clean(formData, "source");
  const pharmacyId = clean(formData, "pharmacyId");
  const pharmacy = await loadSetupPharmacy(pharmacyId);
  const about = clean(formData, "about");
  const tagline = clean(formData, "tagline");

  if (about.length < 50) {
    setupError("profile", "Tell patients a little more about the pharmacy — at least 50 characters.", source);
  }

  await syncVerifiedIdentity(pharmacy);
  await prismaUnscoped.pharmacySettings.update({
    where: { pharmacyId: pharmacy.id },
    data: {
      about,
      tagline: tagline || null,
    },
  });

  revalidatePath("/onboard");
  revalidatePath("/admin/setup");
  revalidatePath(`/p/${pharmacy.slug}`);
  if (source === "onboard") {
    redirect(`/onboard?stage=launch&pharmacyId=${pharmacy.id}`);
  }
  redirect("/onboard?stage=launch");
}
