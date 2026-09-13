"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant-context";
import { createService } from "@/app/lib/services/pharmacy-services";
import { loadLatestVerificationProfile } from "@/app/lib/services/pharmacy-verification";

type SetupPharmacy = NonNullable<Awaited<ReturnType<typeof loadSetupPharmacy>>>;

async function loadSetupPharmacy() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin/setup");

  const pharmacyId = user.activePharmacyId || user.memberships[0]?.pharmacyId;
  if (!pharmacyId) redirect("/onboard");

  const canManage =
    user.platformAdmin ||
    user.memberships.some(
      (membership) =>
        membership.pharmacyId === pharmacyId &&
        (membership.role === "owner" || membership.role === "manager"),
    );
  if (!canManage) redirect("/admin/setup");

  const pharmacy = await prismaUnscoped.pharmacy.findUnique({
    where: { id: pharmacyId },
    include: { owner: { select: { email: true } } },
  });
  if (!pharmacy) redirect("/onboard");
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
  if (!open || !close) return null;
  return `${formatClock(open)} – ${formatClock(close)}`;
}

function setupError(step: string, message: string): never {
  redirect(`/admin/setup?step=${step}&error=${encodeURIComponent(message)}`);
}

export async function saveSetupHoursAction(formData: FormData) {
  const pharmacy = await loadSetupPharmacy();
  const weekday = range(clean(formData, "weekdayOpen"), clean(formData, "weekdayClose"));
  const saturday = range(clean(formData, "saturdayOpen"), clean(formData, "saturdayClose"));
  const sunday = range(clean(formData, "sundayOpen"), clean(formData, "sundayClose"));

  if (!weekday || weekday === "Closed") {
    setupError("hours", "Add your normal Monday to Friday opening hours.");
  }
  if (!saturday || !sunday) {
    setupError("hours", "For weekend hours, enter both opening and closing time or leave both blank.");
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

  revalidatePath("/admin/setup");
  revalidatePath(`/p/${pharmacy.slug}`);
  redirect("/admin/setup?step=medicines");
}

export async function saveSetupServiceAction(formData: FormData) {
  const pharmacy = await loadSetupPharmacy();
  const title = clean(formData, "title");
  const description = clean(formData, "description");
  const priceRaw = clean(formData, "price");
  const price = priceRaw ? Number(priceRaw) : null;

  if (title.length < 3) setupError("services", "Enter a service name.");
  if (description.length < 12) setupError("services", "Add a short description of the service.");
  if (price != null && (!Number.isFinite(price) || price <= 0)) {
    setupError("services", "Enter a valid price or leave it blank.");
  }

  const short = description.length > 120 ? `${description.slice(0, 117).trimEnd()}…` : description;
  try {
    await withPharmacy(pharmacy.id, () =>
      createService({
        title,
        short,
        description,
        price,
        active: true,
        bookable: true,
      }),
    );
  } catch (error) {
    setupError(
      "services",
      error instanceof Error ? error.message : "Could not save this service.",
    );
  }

  revalidatePath("/admin/setup");
  revalidatePath("/services");
  redirect("/admin/setup?step=profile");
}

export async function saveSetupProfileAction(formData: FormData) {
  const pharmacy = await loadSetupPharmacy();
  const about = clean(formData, "about");
  const tagline = clean(formData, "tagline");

  if (about.length < 50) {
    setupError("profile", "Tell patients a little more about the pharmacy — at least 50 characters.");
  }

  await syncVerifiedIdentity(pharmacy);
  await prismaUnscoped.pharmacySettings.update({
    where: { pharmacyId: pharmacy.id },
    data: {
      about,
      tagline: tagline || null,
    },
  });

  revalidatePath("/admin/setup");
  revalidatePath(`/p/${pharmacy.slug}`);
  redirect("/admin/setup?step=billing");
}
