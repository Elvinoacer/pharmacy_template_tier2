"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, writeAuditLog } from "@/app/lib/auth";
import { requirePermission } from "@/app/lib/platform/policy";
import type { Permission } from "@/app/lib/platform/permissions";
import type { SessionUser } from "@/app/lib/types";
import {
  createService,
  updateService,
  deleteService,
  confirmServiceBookingPayment,
  updateBookingStatus,
  notifyBookingCustomer,
} from "@/app/lib/services/pharmacy-services";
import { notifyCareRequest } from "@/app/lib/services/care-request-notifications";
import { prisma } from "@/app/lib/db";

export type AdminServiceState = {
  error?: string;
  success?: string;
  serviceId?: string;
};

function parseBenefits(raw: string): string[] {
  return raw
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseOptionalPrice(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

async function requireCapabilities(
  ...permissions: Permission[]
): Promise<SessionUser> {
  const session = await getSessionUser();
  let actor = session;
  for (const permission of permissions) {
    actor = await requirePermission(actor, permission);
  }
  return actor as SessionUser;
}

export async function saveServiceAction(
  _prev: AdminServiceState,
  formData: FormData,
): Promise<AdminServiceState> {
  let user: SessionUser;
  try {
    user = await requireCapabilities("settings.manage");
  } catch {
    return { error: "You do not have permission to manage pharmacy services." };
  }

  const id = String(formData.get("id") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const short = String(formData.get("short") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const benefits = parseBenefits(String(formData.get("benefits") || ""));
  const eligibility = String(formData.get("eligibility") || "").trim();
  const duration = String(formData.get("duration") || "").trim();
  const imageUrl = String(formData.get("imageUrl") || "").trim();
  const icon = String(formData.get("icon") || "").trim();
  const price = parseOptionalPrice(String(formData.get("price") || ""));
  const bookable = formData.get("bookable") === "on" || formData.get("bookable") === "true";
  const active = formData.get("active") === "on" || formData.get("active") === "true";
  const sortOrderRaw = String(formData.get("sortOrder") || "").trim();
  const sortOrder = sortOrderRaw ? Number(sortOrderRaw) : undefined;

  if (!title) return { error: "Title is required." };
  if (!short) return { error: "Short description is required." };
  if (!description) return { error: "Full description is required." };

  if (user.activePharmacyId) {
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: user.activePharmacyId },
      select: { verifiedAt: true, status: true },
    });
    if (!pharmacy?.verifiedAt) {
      return {
        error:
          "Pharmacy regulatory verification required. Your pharmacy must be verified before publishing care services.",
      };
    }
  }

  const paymentTiming = String(formData.get("paymentTiming") || "").trim();
  let cleanEligibility = eligibility.replace(/\[payable:(?:before|after)\]/gi, "").trim();
  if (paymentTiming === "after") {
    cleanEligibility = `[payable:after] ${cleanEligibility}`.trim();
  } else if (paymentTiming === "before") {
    cleanEligibility = `[payable:before] ${cleanEligibility}`.trim();
  }

  try {
    if (id) {
      const updated = await updateService(id, {
        title,
        slug: slug || undefined,
        short,
        description,
        benefits,
        eligibility: cleanEligibility || null,
        duration: duration || null,
        imageUrl: imageUrl || null,
        icon: icon || null,
        price,
        bookable,
        active,
        sortOrder: sortOrder != null && Number.isFinite(sortOrder) ? sortOrder : undefined,
      });
      await writeAuditLog(user.id, "pharmacy_service_updated", "pharmacy_service", updated.id, {
        slug: updated.slug,
        title: updated.title,
      });
      revalidatePath("/admin/services");
      revalidatePath("/services");
      revalidatePath(`/services/${updated.slug}`);
      revalidatePath("/");
      return { success: `Updated “${updated.title}”.`, serviceId: updated.id };
    }

    const created = await createService({
      title,
      slug: slug || undefined,
      short,
      description,
      benefits,
      eligibility: cleanEligibility || null,
      duration: duration || null,
      imageUrl: imageUrl || null,
      icon: icon || null,
      price,
      bookable,
      active,
      sortOrder: sortOrder != null && Number.isFinite(sortOrder) ? sortOrder : undefined,
    });
    await writeAuditLog(user.id, "pharmacy_service_created", "pharmacy_service", created.id, {
      slug: created.slug,
      title: created.title,
    });
    revalidatePath("/admin/services");
    revalidatePath("/services");
    revalidatePath("/");
    return { success: `Created “${created.title}”.`, serviceId: created.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save service." };
  }
}

export async function deleteServiceAction(
  _prev: AdminServiceState,
  formData: FormData,
): Promise<AdminServiceState> {
  let user: SessionUser;
  try {
    user = await requireCapabilities("settings.manage");
  } catch {
    return { error: "You do not have permission to manage pharmacy services." };
  }

  const id = String(formData.get("id") || "").trim();
  if (!id) return { error: "Missing service id." };

  try {
    const result = await deleteService(id);
    await writeAuditLog(user.id, "pharmacy_service_deleted", "pharmacy_service", id, {
      slug: "slug" in result ? result.slug : undefined,
      soft: "active" in result && result.active === false,
    });
    revalidatePath("/admin/services");
    revalidatePath("/services");
    revalidatePath("/");
    return {
      success:
        "active" in result && result.active === false
          ? "Service deactivated (has booking history)."
          : "Service deleted.",
      serviceId: id,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not delete service." };
  }
}

export type BookingAdminState = {
  error?: string;
  success?: string;
};

export async function recordBookingPaymentAction(
  _prev: BookingAdminState,
  formData: FormData,
): Promise<BookingAdminState> {
  let user: SessionUser;
  try {
    user = await requireCapabilities("prescriptions.dispense", "payments.collect");
  } catch {
    return { error: "You do not have permission to collect payment for clinical bookings." };
  }

  const bookingId = String(formData.get("bookingId") || "").trim();
  const paidVia = String(formData.get("paidVia") || "cash").trim() || "cash";
  const paymentRef = String(formData.get("paymentRef") || "").trim();

  if (!bookingId) return { error: "Missing booking id." };

  try {
    const result = await confirmServiceBookingPayment({
      bookingId,
      paidVia,
      paymentRef: paymentRef || null,
      recordedById: user.id,
    });
    if (!result) return { error: "Booking not found." };

    const booking = await prisma.serviceBooking.findUnique({
      where: { id: bookingId },
      include: { service: { select: { title: true, slug: true } } },
    });

    if (booking && !result.alreadyDone) {
      await notifyBookingCustomer(booking, {
        title: "Booking confirmed",
        body: `Payment recorded for ${booking.service.title}. You're confirmed — see you soon.`,
        url: `/services/${booking.service.slug}`,
      }).catch(() => {});
    }

    await writeAuditLog(user.id, "service_booking_payment", "service_booking", bookingId, {
      paidVia,
      paymentRef,
      alreadyDone: result.alreadyDone,
    });

    revalidatePath("/admin/services/bookings");
    revalidatePath("/admin/orders");
    return {
      success: result.alreadyDone
        ? "Payment was already recorded."
        : `Payment recorded via ${paidVia}. Booking confirmed.`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not record payment." };
  }
}

export async function updateBookingStatusAction(
  _prev: BookingAdminState,
  formData: FormData,
): Promise<BookingAdminState> {
  let user: SessionUser;
  try {
    user = await requireCapabilities("prescriptions.dispense");
  } catch {
    return { error: "You do not have permission to manage clinical bookings." };
  }

  const bookingId = String(formData.get("bookingId") || "").trim();
  const status = String(formData.get("status") || "").trim() as
    | "confirmed"
    | "completed"
    | "cancelled"
    | "awaiting_payment"
    | "requested";
  const staffNotes = String(formData.get("staffNotes") || "").trim();

  if (!bookingId) return { error: "Missing booking id." };
  if (!["confirmed", "completed", "cancelled", "awaiting_payment", "requested"].includes(status)) {
    return { error: "Invalid status." };
  }

  try {
    const previous = await prisma.serviceBooking.findUnique({ where: { id: bookingId } });
    const booking = await updateBookingStatus(
      bookingId,
      status,
      staffNotes || undefined,
    );
    const full = await prisma.serviceBooking.findUnique({
      where: { id: booking.id },
      include: { service: { select: { title: true, slug: true } } },
    });

    if (full && previous?.status !== status) {
      await notifyCareRequest({ id: full.id, pharmacyId: full.pharmacyId, relatedType: "service_booking", staff: true,
        title: "Booking status updated", body: `${full.fullName}: ${full.service.title} — ${status.replaceAll("_", " ")}.` });
      const messages: Record<string, { title: string; body: string }> = {
        requested: { title: "Booking request received", body: `Your ${full.service.title} request is pending confirmation by our pharmacy team.` },
        awaiting_payment: { title: "Booking awaiting payment", body: "Your booking is awaiting payment. Contact the pharmacy to arrange payment and confirm your visit." },
        confirmed: {
          title: "Booking confirmed",
          body: `Your ${full.service.title} booking is confirmed. We'll see you soon.`,
        },
        completed: {
          title: "Service completed",
          body: `Thanks for visiting for ${full.service.title}. Take care!`,
        },
        cancelled: {
          title: "Booking cancelled",
          body: `Your ${full.service.title} booking was cancelled. Call us if you need to rebook.`,
        },
      };
      const msg = messages[status];
      if (msg) {
        await notifyBookingCustomer(full, {
          ...msg,
          url: `/services/${full.service.slug}`,
        }).catch(() => {});
      }
    }

    await writeAuditLog(user.id, "service_booking_status", "service_booking", bookingId, {
      status,
    });
    revalidatePath("/admin/services/bookings");
    return { success: `Booking marked ${status}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update booking." };
  }
}
