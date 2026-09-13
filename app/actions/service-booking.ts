"use server";
import { issueOrderAccessToken } from "@/app/lib/services/payments";

import { acceptingCareRequests } from "@/app/lib/services/care-request-availability";
import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy, withPlatformBypass } from "@/app/lib/tenant-context";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import { getSessionUser } from "@/app/lib/auth";
import {
  createServiceBooking,
  BookingValidationError,
  notifyBookingCustomer,
} from "@/app/lib/services/pharmacy-services";

export type ServiceBookingState = {
  error?: string;
  success?: string;
  bookingId?: string;
  orderId?: string | null;
  accessToken?: string;
  requiresPayment?: boolean;
  amount?: number | null;
  phone?: string;
  serviceTitle?: string;
  status?: string;
};

/**
 * Public service booking form action.
 * Phone is required. Priced services stay awaiting_payment until M-Pesa/cash.
 */
export async function bookServiceAction(
  _prev: ServiceBookingState,
  formData: FormData,
): Promise<ServiceBookingState> {
  const serviceId = String(formData.get("serviceId") || "").trim();
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const notes = String(formData.get("notes") || "").trim();
  const preferredDate = String(formData.get("preferredDate") || "").trim();
  const preferredTime = String(formData.get("preferredTime") || "").trim();
  const pushToken = String(formData.get("pushToken") || "").trim();

  if (!serviceId) return { error: "Please select a service." };
  if (!fullName || fullName.length < 2) return { error: "Your name is required." };
  if (!phone || phone.replace(/\D/g, "").length < 9) {
    return {
      error: "A valid phone number is required so we can confirm your booking.",
    };
  }

  const rateKey = `service-booking:${phone.replace(/\D/g, "").slice(-9)}`;
  const rl = await checkRateLimitAsync(rateKey, {
    limit: 8,
    windowMs: 60 * 60 * 1000,
    failClosed: true,
  });
  if (!rl.allowed) {
    return {
      error: `Too many booking attempts. Try again in ${rl.retryAfterSeconds}s, or call the pharmacy.`,
    };
  }

  if (!z.string().uuid().safeParse(serviceId).success) return { error: "This service link is invalid. Please open an available service listing." };
  const listing = await withPlatformBypass(() => prismaUnscoped.pharmacyService.findFirst({ where: { id: serviceId, active: true, bookable: true, pharmacy: acceptingCareRequests }, select: { pharmacyId: true } })).catch(() => null);
  if (!listing) return { error: "This service is no longer available for online booking. Please explore the current services." };
  return withPharmacy(listing.pharmacyId, async () => {
  const session = await getSessionUser().catch(() => null);

  // Never infer account ownership from public form fields. Email addresses and
  // phone numbers are identifiers, not authentication factors. Only an
  // authenticated customer session may attach a booking/order to that account;
  // otherwise the booking remains a guest record even if its contact details
  // happen to match an existing customer.
  const customerId = session?.customerId ?? null;

  let result: Awaited<ReturnType<typeof createServiceBooking>>;
  try {
    result = await createServiceBooking({
      serviceId,
      fullName,
      phone,
      email: email || null,
      notes: notes || null,
      preferredDate: preferredDate || null,
      preferredTime: preferredTime || null,
      pushToken: pushToken || null,
      customerId,
    });
  } catch (e) {
    console.error("[bookServiceAction]", e);
    return {
      error:
        e instanceof BookingValidationError
          ? e.message
          : "Could not submit booking. Please try again or call us.",
    };
  }

  const { booking, requiresPayment, orderId, amount } = result;
  const serviceTitle = booking.service.title;

  try {
    const { dispatchPushToStaff } = await import("@/app/lib/services/push");
    await dispatchPushToStaff({
      title: requiresPayment ? "Booking awaiting payment" : "New service booking",
      body: `${fullName}: ${serviceTitle}`,
      url: "/admin/services/bookings",
      data: { tag: `booking-${booking.id}`, bookingId: booking.id },
    });
  } catch {
    /* non-fatal */
  }

  // Customer push — immediate acknowledgement. Guest bookings can use the
  // one-shot push token supplied by that browser, but never a guessed account.
  await notifyBookingCustomer(
    {
      id: booking.id,
      pushToken: booking.pushToken,
      customerId: booking.customerId,
      fullName: booking.fullName,
      phone: booking.phone,
      pharmacyId: booking.pharmacyId,
      email: booking.email,
    },
    requiresPayment
      ? {
          title: "Complete payment to confirm",
          body: `Your ${serviceTitle} request is held. Pay KES ${amount?.toLocaleString() ?? ""} via M-Pesa to confirm.`,
          url: `/services/${booking.service.slug}`,
        }
      : {
          title: "Booking received",
          body: `We've received your ${serviceTitle} request. Our team will follow up on ${booking.phone}.`,
          url: `/services/${booking.service.slug}`,
        },
  ).catch(() => {});

  revalidatePath("/admin/services");
  revalidatePath("/admin/services/bookings");
  revalidatePath("/services");

  return {
    success: requiresPayment
      ? `Request received. Pay KES ${amount?.toLocaleString() ?? ""} via M-Pesa to confirm your ${serviceTitle} booking.`
      : `You're booked for ${serviceTitle}. We'll reach you on ${phone} to confirm timing.`,
    bookingId: booking.id,
    orderId: orderId ?? null,
    accessToken: orderId ? await issueOrderAccessToken(orderId) : undefined,
    requiresPayment,
    amount: amount ?? null,
    phone: booking.phone,
    serviceTitle,
    status: booking.status,
  };
  });
}
