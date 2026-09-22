import "server-only";

import { AuthError } from "@/app/lib/auth";
import type { SessionUser } from "@/app/lib/types";
import { getTenant } from "@/app/lib/tenant";
import { authorize } from "@/app/lib/platform/policy";
import { assertPharmacyWorkspaceOperable } from "@/app/lib/platform/tenant-access";

async function resolveMedicationPharmacyId(user: SessionUser): Promise<string> {
  const tenant = await getTenant().catch(() => ({ pharmacyId: null as string | null }));
  const pharmacyId = tenant.pharmacyId ?? user.activePharmacyId;
  if (!pharmacyId) throw new AuthError("Choose an active pharmacy workspace first.", 409);
  return pharmacyId;
}

export async function requireMedicationReadContext(user: SessionUser): Promise<string> {
  const pharmacyId = await resolveMedicationPharmacyId(user);
  await authorize({ actor: user, action: "inventory.read", tenantId: pharmacyId });
  return pharmacyId;
}

export async function requireMedicationWriteContext(user: SessionUser): Promise<string> {
  const pharmacyId = await resolveMedicationPharmacyId(user);
  await authorize({ actor: user, action: "inventory.write", tenantId: pharmacyId });
  await assertPharmacyWorkspaceOperable(pharmacyId);
  return pharmacyId;
}
