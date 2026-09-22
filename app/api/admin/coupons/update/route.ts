import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { hasPremiumPlan } from "@/app/lib/platform/entitlements";

export const runtime = "nodejs";

const Body = z.object({
  id: z.string().uuid(),
  code: z.string().trim().toUpperCase().optional(),
  description: z.string().trim().optional(),
  discountType: z.enum(["percent", "fixed", "points"]).optional(),
  discountValue: z.coerce.number().min(0).optional(),
  pointsCost: z.coerce.number().min(0).optional(),
  maxRedemptions: z.coerce.number().int().min(0).optional(),
  validUntil: z.string().optional(),
  active: z.boolean().optional(),
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

  const pharmacyId =
    user.activePharmacyId ||
    user.memberships.find((membership) => membership.status === "active")?.pharmacyId;
  if (!pharmacyId) {
    return NextResponse.json({ error: "no_active_pharmacy" }, { status: 403 });
  }

  if (!(await hasPremiumPlan(pharmacyId))) {
    const changedFields = Object.entries(parsed)
      .filter(([key, value]) => key !== "id" && value !== undefined)
      .map(([key]) => key);
    const deactivationOnly =
      changedFields.length === 1 &&
      changedFields[0] === "active" &&
      parsed.active === false;

    if (!deactivationOnly) {
      return NextResponse.json(
        {
          error: "premium_required",
          message: "Promotional coupon management is available on Premium. Existing coupons can still be archived on Free.",
        },
        { status: 402 },
      );
    }
  }

  try {
    const updated = await prisma.coupon.update({
      where: { id: parsed.id },
      data: {
        ...(parsed.code ? { code: parsed.code } : {}),
        ...(parsed.description !== undefined ? { description: parsed.description } : {}),
        ...(parsed.discountType ? { discountType: parsed.discountType } : {}),
        ...(parsed.discountValue !== undefined ? { discountValue: parsed.discountValue } : {}),
        ...(parsed.pointsCost !== undefined ? { pointsCost: parsed.pointsCost } : {}),
        ...(parsed.maxRedemptions !== undefined ? { maxRedemptions: parsed.maxRedemptions } : {}),
        ...(parsed.validUntil !== undefined ? { validUntil: parsed.validUntil ? new Date(parsed.validUntil) : null } : {}),
        ...(parsed.active !== undefined ? { active: parsed.active } : {}),
      },
    });
    return NextResponse.json({ ok: true, coupon: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "update_failed" },
      { status: 500 },
    );
  }
}
