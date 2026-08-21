import "server-only";

import { prisma } from "@/app/lib/db";
import { formatMpesaPhone } from "@/app/lib/services/daraja";

export type PublicService = {
  id: string;
  slug: string;
  title: string;
  short: string;
  description: string;
  benefits: string[];
  eligibility: string | null;
  duration: string | null;
  imageUrl: string | null;
  icon: string | null;
  price: number | null;
  bookable: boolean;
  sortOrder: number;
};

function toPublic(row: {
  id: string;
  slug: string;
  title: string;
  short: string;
  description: string;
  benefits: string[];
  eligibility: string | null;
  duration: string | null;
  imageUrl: string | null;
  icon: string | null;
  price: { toString(): string } | number | null;
  bookable: boolean;
  sortOrder: number;
}): PublicService {
  const price =
    row.price == null
      ? null
      : typeof row.price === "number"
        ? row.price
        : Number(row.price.toString());
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    short: row.short,
    description: row.description,
    benefits: row.benefits || [],
    eligibility: row.eligibility,
    duration: row.duration,
    imageUrl: row.imageUrl,
    icon: row.icon,
    price: price != null && Number.isFinite(price) && price > 0 ? price : null,
    bookable: row.bookable,
    sortOrder: row.sortOrder,
  };
}

export function slugifyService(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Active services for public catalogue. */
export async function listPublicServices(): Promise<PublicService[]> {
  const rows = await prisma.pharmacyService.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  return rows.map(toPublic);
}

export async function getPublicServiceBySlug(
  slug: string,
): Promise<PublicService | null> {
  const row = await prisma.pharmacyService.findFirst({
    where: { slug, active: true },
  });
  return row ? toPublic(row) : null;
}

export async function listAdminServices() {
  return prisma.pharmacyService.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      _count: { select: { bookings: true } },
    },
  });
}

export async function getAdminService(id: string) {
  return prisma.pharmacyService.findUnique({
    where: { id },
    include: {
      _count: { select: { bookings: true } },
    },
  });
}

export type CreateServiceInput = {
  title: string;
  slug?: string;
  short: string;
  description: string;
  benefits?: string[];
  eligibility?: string | null;
  duration?: string | null;
  imageUrl?: string | null;
  icon?: string | null;
  price?: number | null;
  bookable?: boolean;
  active?: boolean;
  sortOrder?: number;
};

export async function createService(input: CreateServiceInput) {
  const slug = slugifyService(input.slug || input.title);
  if (!slug) throw new Error("A valid slug is required.");

  const existing = await prisma.pharmacyService.findFirst({ where: { slug } });
  if (existing) throw new Error(`Service slug "${slug}" already exists.`);

  const maxSort = await prisma.pharmacyService.aggregate({
    _max: { sortOrder: true },
  });

  return prisma.pharmacyService.create({
    data: {
      title: input.title.trim(),
      slug,
      short: input.short.trim(),
      description: input.description.trim(),
      benefits: (input.benefits || []).map((b) => b.trim()).filter(Boolean),
      eligibility: input.eligibility?.trim() || null,
      duration: input.duration?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      icon: input.icon?.trim() || null,
      price:
        input.price != null && Number.isFinite(input.price) && input.price > 0
          ? input.price
          : null,
      bookable: input.bookable ?? true,
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 10,
    },
  });
}

export async function updateService(
  id: string,
  input: Partial<CreateServiceInput>,
) {
  const current = await prisma.pharmacyService.findUnique({ where: { id } });
  if (!current) throw new Error("Service not found.");

  let nextSlug: string | undefined;
  if (input.slug !== undefined || input.title !== undefined) {
    nextSlug = slugifyService(input.slug || input.title || current.title);
    if (!nextSlug) throw new Error("A valid slug is required.");
    if (nextSlug !== current.slug) {
      const clash = await prisma.pharmacyService.findFirst({
        where: { slug: nextSlug },
      });
      if (clash) throw new Error(`Service slug "${nextSlug}" already exists.`);
    }
  }

  return prisma.pharmacyService.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
      ...(input.short !== undefined ? { short: input.short.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() }
        : {}),
      ...(input.benefits !== undefined
        ? {
            benefits: input.benefits.map((b) => b.trim()).filter(Boolean),
          }
        : {}),
      ...(input.eligibility !== undefined
        ? { eligibility: input.eligibility?.trim() || null }
        : {}),
      ...(input.duration !== undefined
        ? { duration: input.duration?.trim() || null }
        : {}),
      ...(input.imageUrl !== undefined
        ? { imageUrl: input.imageUrl?.trim() || null }
        : {}),
      ...(input.icon !== undefined ? { icon: input.icon?.trim() || null } : {}),
      ...(input.price !== undefined
        ? {
            price:
              input.price != null &&
              Number.isFinite(input.price) &&
              input.price > 0
                ? input.price
                : null,
          }
        : {}),
      ...(input.bookable !== undefined ? { bookable: input.bookable } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });
}

export async function deleteService(id: string) {
  const current = await prisma.pharmacyService.findUnique({
    where: { id },
    include: { _count: { select: { bookings: true } } },
  });
  if (!current) throw new Error("Service not found.");
  if (current._count.bookings > 0) {
    // Soft-delete to preserve booking history.
    return prisma.pharmacyService.update({
      where: { id },
      data: { active: false, bookable: false },
    });
  }
  return prisma.pharmacyService.delete({ where: { id } });
}

export type BookingInput = {
  serviceId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
  pushToken?: string | null;
  customerId?: string | null;
};

/**
 * Create a service booking.
 * - Priced service → status=awaiting_payment + linked Order for M-Pesa
 * - Unpriced → status=confirmed immediately
 */
export async function createServiceBooking(input: BookingInput) {
  const service = await prisma.pharmacyService.findFirst({
    where: { id: input.serviceId, active: true, bookable: true },
  });
  if (!service) throw new Error("This service is not available for booking.");

  const fullName = input.fullName.trim();
  const phoneRaw = input.phone.trim();
  if (fullName.length < 2) throw new Error("Your name is required.");
  if (phoneRaw.replace(/\D/g, "").length < 9) {
    throw new Error("A valid phone number is required.");
  }

  const mpesaPhone = formatMpesaPhone(phoneRaw);
  const priceNum =
    service.price == null ? null : Number(service.price.toString());
  const requiresPayment =
    priceNum != null && Number.isFinite(priceNum) && priceNum > 0;

  const result = await prisma.$transaction(async (tx) => {
    let orderId: string | null = null;

    if (requiresPayment) {
      const order = await tx.order.create({
        data: {
          customerId: input.customerId || null,
          source: "service_booking",
          status: "pending",
          total: priceNum!,
          notes: [
            `Service booking: ${service.title}`,
            `Name: ${fullName}`,
            `Phone: ${phoneRaw}`,
            input.email ? `Email: ${input.email}` : null,
            input.preferredDate ? `Preferred date: ${input.preferredDate}` : null,
            input.preferredTime ? `Preferred time: ${input.preferredTime}` : null,
            input.notes || null,
          ]
            .filter(Boolean)
            .join("\n"),
          guestName: fullName,
          guestPhone: mpesaPhone,
          fulfillment: "reserve",
          items: {
            create: {
              name: service.title,
              quantity: 1,
              unitPrice: priceNum!,
            },
          },
        },
      });
      orderId = order.id;
    }

    const booking = await tx.serviceBooking.create({
      data: {
        serviceId: service.id,
        customerId: input.customerId || null,
        fullName,
        phone: mpesaPhone,
        email: input.email?.trim().toLowerCase() || null,
        notes: input.notes?.trim() || null,
        preferredDate: input.preferredDate?.trim() || null,
        preferredTime: input.preferredTime?.trim() || null,
        status: requiresPayment ? "awaiting_payment" : "confirmed",
        paymentStatus: requiresPayment ? "unpaid" : "none",
        amount: requiresPayment ? priceNum! : null,
        orderId,
        pushToken: input.pushToken?.trim() || null,
      },
      include: {
        service: { select: { title: true, slug: true, price: true } },
      },
    });

    return { booking, requiresPayment, orderId, amount: priceNum };
  });

  return result;
}

/**
 * Confirm a priced booking after payment (M-Pesa callback or admin cash).
 * Idempotent.
 */
export async function confirmServiceBookingPayment(opts: {
  orderId?: string;
  bookingId?: string;
  paidVia: string;
  paymentRef?: string | null;
  recordedById?: string | null;
}): Promise<{ bookingId: string; alreadyDone: boolean } | null> {
  const booking = opts.bookingId
    ? await prisma.serviceBooking.findUnique({
        where: { id: opts.bookingId },
        include: { service: { select: { title: true, slug: true } } },
      })
    : opts.orderId
      ? await prisma.serviceBooking.findUnique({
          where: { orderId: opts.orderId },
          include: { service: { select: { title: true, slug: true } } },
        })
      : null;

  if (!booking) return null;

  if (
    booking.status === "confirmed" ||
    booking.status === "completed" ||
    booking.paymentStatus === "paid" ||
    booking.paymentStatus === "waived" ||
    booking.paymentStatus === "cash"
  ) {
    return { bookingId: booking.id, alreadyDone: true };
  }

  const paymentStatus =
    opts.paidVia === "waive"
      ? "waived"
      : opts.paidVia === "cash"
        ? "cash"
        : "paid";

  await prisma.serviceBooking.update({
    where: { id: booking.id },
    data: {
      status: "confirmed",
      paymentStatus,
      paidAt: new Date(),
      paidVia: opts.paidVia,
      paymentRef: opts.paymentRef || null,
      recordedById: opts.recordedById || null,
    },
  });

  // If admin recorded cash and order still pending, mark order paid too.
  if (booking.orderId && opts.paidVia !== "daraja") {
    await prisma.order
      .update({
        where: { id: booking.orderId },
        data: {
          status: opts.paidVia === "waive" ? "waived" : "paid",
          ...(opts.paidVia === "waive"
            ? { waived: true, waivedReason: "Service booking waived by staff" }
            : {}),
        },
      })
      .catch(() => {});

    if (opts.paidVia === "cash" || opts.paidVia === "card" || opts.paidVia === "other") {
      const amount = booking.amount ? Number(booking.amount.toString()) : 0;
      if (amount > 0) {
        await prisma.payment
          .create({
            data: {
              orderId: booking.orderId,
              customerId: booking.customerId,
              amount,
              provider:
                opts.paidVia === "cash"
                  ? "cash"
                  : opts.paidVia === "card"
                    ? "card"
                    : "other",
              status: "completed",
              providerRef:
                opts.paymentRef ||
                `${opts.paidVia.toUpperCase()}-${booking.id.slice(0, 8)}`,
              phone: booking.phone,
              initiatedById: opts.recordedById || null,
            },
          })
          .catch(() => {});
      }
    }
  }

  return { bookingId: booking.id, alreadyDone: false };
}

export async function updateBookingStatus(
  id: string,
  status: "confirmed" | "completed" | "cancelled" | "awaiting_payment",
  staffNotes?: string | null,
) {
  return prisma.serviceBooking.update({
    where: { id },
    data: {
      status,
      ...(staffNotes !== undefined ? { staffNotes: staffNotes?.trim() || null } : {}),
    },
  });
}

export async function listAdminBookings(opts?: {
  status?: string;
  take?: number;
}) {
  return prisma.serviceBooking.findMany({
    where: opts?.status && opts.status !== "all" ? { status: opts.status } : undefined,
    orderBy: { createdAt: "desc" },
    take: opts?.take ?? 100,
    include: {
      service: { select: { id: true, title: true, slug: true, price: true } },
      customer: { select: { id: true, fullName: true } },
    },
  });
}

/** Notify customer via one-shot push token and/or linked user devices. */
export async function notifyBookingCustomer(
  booking: {
    id: string;
    pushToken?: string | null;
    customerId?: string | null;
    fullName: string;
    phone: string;
  },
  payload: { title: string; body: string; url?: string },
) {
  const { sendPush, isFirebaseConfigured } = await import(
    "@/app/lib/firebase/admin"
  );
  const { dispatchPushToUser } = await import("@/app/lib/services/push");

  if (booking.pushToken && isFirebaseConfigured()) {
    await sendPush({
      token: booking.pushToken,
      title: payload.title,
      body: payload.body,
      url: payload.url || `/services`,
      data: { tag: `booking-${booking.id}`, bookingId: booking.id },
    }).catch(() => {});
  }

  if (booking.customerId) {
    const profile = await prisma.customerProfile.findUnique({
      where: { id: booking.customerId },
      select: { userId: true },
    });
    if (profile?.userId) {
      await dispatchPushToUser(profile.userId, {
        title: payload.title,
        body: payload.body,
        url: payload.url || `/services`,
        data: { tag: `booking-${booking.id}`, bookingId: booking.id },
      }).catch(() => {});
    }
  }
}
