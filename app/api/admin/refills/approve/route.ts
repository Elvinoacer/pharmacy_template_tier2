import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { approveRefillRequest } from "@/app/lib/services/refills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }

    const result = await approveRefillRequest(id, user.id, {
      markPreparing: body.markPreparing === true,
      markPaid: body.markPaid === true,
      paymentMethod: body.paymentMethod || "cash",
      notes: body.notes || undefined,
      overrideUnitPrice: body.overrideUnitPrice ? Number(body.overrideUnitPrice) : undefined,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    const isStock = message.toLowerCase().includes("stock");
    return NextResponse.json(
      { error: isStock ? "insufficient_stock" : "approval_failed", message },
      { status: isStock ? 409 : 500 },
    );
  }
}
