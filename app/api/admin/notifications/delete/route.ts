import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  id: z.string().uuid().optional(),
  all: z.boolean().optional(),
});

/**
 * Delete admin notifications (soft-deletes by setting isRead + clearing).
 * We hard-delete since these are transient inbox items, not audit records.
 */
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

  if (parsed.all) {
    const r = await prisma.adminNotification.deleteMany({});
    return NextResponse.json({ ok: true, count: r.count });
  }
  if (parsed.id) {
    await prisma.adminNotification.delete({ where: { id: parsed.id } });
  }
  return NextResponse.json({ ok: true });
}
