import "server-only";
import { prisma } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant-context";
import { sendDelivery } from "./delivery";
import { dispatchPushToStaff } from "./push";

/** Persist the attempt before sending; a provider outage never undoes a saved request. */
export async function notifyCareRequest(input: {
  id: string;
  pharmacyId: string;
  customerId?: string | null;
  phone?: string | null;
  email?: string | null;
  relatedType: "service_booking" | "refill_request";
  title: string;
  body: string;
  inApp?: boolean;
  staff?: boolean;
}) {
  return withPharmacy(input.pharmacyId, async () => {
    const jobs: Promise<unknown>[] = [];
    if (input.inApp && input.customerId) jobs.push(prisma.notification.create({
      data: { customerId: input.customerId, channel: "in_app", type: input.relatedType,
        title: input.title, body: input.body, relatedType: input.relatedType,
        relatedId: input.id, status: "delivered", sentAt: new Date() },
    }));
    if (input.staff) {
      jobs.push(prisma.adminNotification.create({ data: {
        type: input.relatedType === "refill_request" ? "refill_status" : "booking_status",
        title: input.title, body: input.body, relatedType: input.relatedType, relatedId: input.id,
      } }));
      jobs.push(dispatchPushToStaff({ title: input.title, body: input.body,
        url: input.relatedType === "refill_request" ? "/admin/refills" : "/admin/services/bookings" }));
    }
    for (const channel of ["sms", "email"] as const) {
      if (!(channel === "sms" ? input.phone : input.email)) continue;
      jobs.push((async () => {
        const profile = input.customerId ? await prisma.customerProfile.findUnique({
          where: { id: input.customerId }, select: { preferences: true },
        }) : null;
        const recipient = { email: input.email, phone: input.phone?.replace(/^(254\d{9})$/, "+$1"), preferences: profile?.preferences };
        const payload = { channel, recipient, subject: input.title, body: input.body, purpose: "transactional" as const };
        const attempt = await prisma.notificationDelivery.create({ data: {
          pharmacyId: input.pharmacyId, channel, status: "processing",
          payload: { ...payload, relatedType: input.relatedType, relatedId: input.id },
        } });
        try {
        const result = await sendDelivery(payload, { persist: false });
        await prisma.notificationDelivery.update({ where: { id: attempt.id }, data: {
          status: result.status === "pending" ? "failed" : result.status,
          provider: result.provider, providerMessageId: result.providerMessageId,
          error: result.error ?? null, attempt: 1,
          sentAt: result.status === "sent" || result.status === "delivered" ? new Date() : null,
        } });
        } catch {
          await prisma.notificationDelivery.update({ where: { id: attempt.id }, data: { status: "failed", error: "Provider delivery failed. Retry from notifications.", attempt: 1 } });
        }
      })());
    }
    const results = await Promise.allSettled(jobs);
    for (const result of results) if (result.status === "rejected") {
      console.error("[care-request-notification] attempt failed", input.relatedType, input.id);
    }
  });
}
