import type { ReactNode } from "react";

import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { reconcilePharmacyBillingStk } from "@/app/lib/platform/reconcile-billing-stk";

export const dynamic = "force-dynamic";

/**
 * Keep billing state moving even when Safaricom's asynchronous callback is
 * delayed. The existing billing page refresh loop passes through this layout,
 * which performs an authenticated STK status reconciliation before rendering.
 */
export default async function PharmacyBillingLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (user) {
    const pharmacy = await prismaUnscoped.pharmacy.findFirst({
      where: {
        ownerUserId: user.id,
        ...(user.activePharmacyId ? { id: user.activePharmacyId } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (pharmacy) {
      await reconcilePharmacyBillingStk(pharmacy.id).catch((error) => {
        console.warn("[billing][daraja-status] page reconciliation failed", {
          pharmacyId: pharmacy.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }
  }

  return children;
}
