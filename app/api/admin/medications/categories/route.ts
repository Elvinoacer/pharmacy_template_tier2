import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isStaff, writeAuditLog } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  action: z.literal("rename"),
  from: z.string().min(1).max(80),
  to: z.string().min(1).max(80),
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

  const to = parsed.to.trim().toLowerCase().replace(/\s+/g, "-");
  const result = await prisma.medication.updateMany({
    where: { category: parsed.from },
    data: { category: to },
  });

  await writeAuditLog(user.id, "medication_category_renamed", "medication", undefined, {
    from: parsed.from,
    to,
    count: result.count,
  });

  return NextResponse.json({ ok: true, count: result.count });
}
