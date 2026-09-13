import { withPlatformBypass } from "@/app/lib/tenant-context";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  id: z.string().uuid().optional(),
  all: z.boolean().optional(),
});

/**
 * Soft-delete customer notifications (sets deletedAt = now so they disappear
 * from the feed but stay in the DB for audit).
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user?.customerId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  return withPlatformBypass(async () => {
  if (parsed.all) {
    const r = await prisma.notification.updateMany({
      where: { customerId: user.customerId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ ok: true, count: r.count });
  }

  if (parsed.id) {
    await prisma.notification.updateMany({
      where: { id: parsed.id, customerId: user.customerId },
      data: { deletedAt: new Date() },
    });
  }
  return NextResponse.json({ ok: true });
  });
}
