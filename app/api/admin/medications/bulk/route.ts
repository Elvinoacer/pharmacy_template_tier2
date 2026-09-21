import { listingLimitMessage } from "@/app/lib/platform/plan-policy";
import { assertPublicMedicineSlot } from "@/app/lib/platform/plan-enforcement";
import { hasPremiumPlan } from "@/app/lib/platform/entitlements";
import { peekTenant } from "@/app/lib/tenant-context";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isStaff, writeAuditLog } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["deactivate", "activate", "unpublish", "publish"]),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const data =
    parsed.action === "deactivate"
      ? { active: false }
      : parsed.action === "activate"
        ? { active: true }
        : parsed.action === "unpublish"
          ? { publicListing: false }
          : { publicListing: true };

  try {
  const pharmacyId = peekTenant()?.pharmacyId;
  if (pharmacyId && (parsed.action === "publish" || parsed.action === "activate") && !(await hasPremiumPlan(pharmacyId))) {
    const becomingPublic =
      parsed.action === "publish"
        ? await prisma.pharmacyInventory.count({
            where: { id: { in: parsed.ids }, active: true, publicListing: false },
          })
        : await prisma.pharmacyInventory.count({
            where: { id: { in: parsed.ids }, active: false, publicListing: true },
          });
    await assertPublicMedicineSlot(pharmacyId, becomingPublic);
  }
  const result = await prisma.pharmacyInventory.updateMany({
    where: { id: { in: parsed.ids } },
    data,
  });

  await writeAuditLog(user.id, `medication_bulk_${parsed.action}`, "medication", undefined, {
    ids: parsed.ids,
    count: result.count,
  });

  return NextResponse.json({
    ok: true,
    count: result.count,
    message: `Updated ${result.count} medication(s) (${parsed.action}).`,
  });
  } catch (error) {
    const limit = listingLimitMessage(error);
    return NextResponse.json({ error: limit ? "upgrade_required" : "update_failed", message: limit || "Could not update listings. Please try again." }, { status: limit ? 402 : 500 });
  }
}
