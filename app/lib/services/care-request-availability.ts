import "server-only";
import { prismaUnscoped } from "@/app/lib/db";
import { withPlatformBypass } from "@/app/lib/tenant-context";

export const acceptingCareRequests = {
  status: "active" as const, listed: true, verifiedAt: { not: null },
};

export async function acceptsCareRequests(pharmacyId: string) {
  return Boolean(await withPlatformBypass(() => prismaUnscoped.pharmacy.findFirst({
    where: { id: pharmacyId, ...acceptingCareRequests }, select: { id: true },
  })));
}
