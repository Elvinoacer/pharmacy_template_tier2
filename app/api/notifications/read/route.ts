import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  id: z.string().uuid().optional(),
  all: z.boolean().optional(),
  scope: z.enum(["customer", "admin"]).optional(),
});

/// Marks one notification (or all of the user's) as opened so the unread badge clears.
/// For staff, the `scope: "admin"` variant marks the admin inbox (AdminNotification) as read.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // Staff admin inbox mark-all-read.
  if (parsed.scope === "admin" && isStaff(user.role)) {
    if (parsed.all) {
      const r = await prisma.adminNotification.updateMany({
        where: { isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({ ok: true, count: r.count });
    }
    if (parsed.id) {
      await prisma.adminNotification.update({
        where: { id: parsed.id },
        data: { isRead: true, readAt: new Date() },
      });
    }
    return NextResponse.json({ ok: true });
  }

  // Customer notification mark-as-read.
  if (parsed.all) {
    if (user.customerId) {
      await prisma.notification.updateMany({
        where: { customerId: user.customerId, openedAt: null, deletedAt: null },
        data: { openedAt: new Date() },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (parsed.id && user.customerId) {
    await prisma.notification.updateMany({
      where: { id: parsed.id, customerId: user.customerId },
      data: { openedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
