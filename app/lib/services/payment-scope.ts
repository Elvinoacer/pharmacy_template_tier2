import "server-only";
import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy, withPlatformBypass } from "@/app/lib/tenant-context";
import { getSessionUser } from "@/app/lib/auth";
import { verifyOrderAccessToken } from "./payments";

/** Resolve an order across the network, authorize its owner, then enter only its tenant. */
export async function withAuthorizedPayment<T>(
  input: { orderId?: string; paymentId?: string; accessToken?: string | null; phone?: string | null },
  run: () => Promise<T>
): Promise<T | null> {
  const user = await getSessionUser().catch(() => null);
  const order = await withPlatformBypass(async () => {
    const orderId =
      input.orderId ||
      (input.paymentId
        ? (
            await prismaUnscoped.payment.findUnique({
              where: { id: input.paymentId },
              select: { orderId: true },
            })
          )?.orderId
        : null);
    if (!orderId) return null;
    return prismaUnscoped.order.findUnique({
      where: { id: orderId },
      select: { id: true, pharmacyId: true, customerId: true, guestPhone: true },
    });
  });
  if (!order) return null;
  const staff =
    user?.memberships.some(
      (membership) =>
        membership.pharmacyId === order.pharmacyId && membership.status === "active",
    ) ?? false;
  const owner = Boolean(user?.customerId && user.customerId === order.customerId);
  const token = await withPlatformBypass(() =>
    verifyOrderAccessToken(order.id, input.accessToken),
  );
  if (!owner && !staff && !token) return null;
  return withPharmacy(order.pharmacyId, run);
}

