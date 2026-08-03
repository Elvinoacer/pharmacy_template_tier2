import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  customerId: z.string().uuid(),
  order: z.array(z.string().uuid()),
});

/**
 * Persist a new drag-and-drop ordering for a customer's notes.
 * We reassign sortOrder=0..N in the order given. Pinned status is preserved
 * separately; the client sorts pinned-first before displaying.
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

  await prisma.$transaction(
    parsed.order.map((id, i) =>
      prisma.customerNote.update({
        where: { id },
        data: { sortOrder: i },
      }),
    ),
  );
  return NextResponse.json({ ok: true });
}
