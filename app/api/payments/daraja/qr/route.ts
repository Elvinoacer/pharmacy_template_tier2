import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped as db } from "@/app/lib/db";
import { generateDynamicQr } from "@/app/lib/services/daraja-operations";

export const runtime = "nodejs";

const RequestBody = z.object({ invoiceId: z.string().uuid(), size: z.number().int().min(200).max(500).optional() });

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const parsed = RequestBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });

  const invoice = await db.invoice.findUnique({
    where: { id: parsed.data.invoiceId },
    include: { pharmacy: { select: { ownerUserId: true, name: true } } },
  });
  if (!invoice || invoice.pharmacy.ownerUserId !== user.id) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (invoice.status !== "open" || Number(invoice.totalKes) <= 0) return NextResponse.json({ ok: false, error: "invoice_not_collectible" }, { status: 409 });

  const result = await generateDynamicQr({
    reference: invoice.number,
    amountKes: Number(invoice.totalKes),
    merchantName: invoice.pharmacy.name,
    transactionCode: "PB",
    size: parsed.data.size,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}
