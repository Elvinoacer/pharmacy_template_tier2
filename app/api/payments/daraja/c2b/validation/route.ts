import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { prismaUnscoped as db } from "@/app/lib/db";
import { withPlatformBypass } from "@/app/lib/tenant-context";

export const runtime = "nodejs";

type C2BPayload = { BillRefNumber?: string; TransAmount?: string | number };

function authorized(request: Request) {
  const expected = process.env.DARAJA_C2B_WEBHOOK_SECRET?.trim();
  const received = new URL(request.url).searchParams.get("token") || "";
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

function response(code: number, desc: string) {
  return NextResponse.json({ ResultCode: code, ResultDesc: desc });
}

export async function POST(request: Request) {
  if (!authorized(request)) return response(1, "Rejected");
  const body = (await request.json().catch(() => null)) as C2BPayload | null;
  const reference = String(body?.BillRefNumber || "").trim();
  const amount = Number(body?.TransAmount);
  if (!reference || !Number.isFinite(amount) || amount <= 0) return response(1, "Invalid payment");

  try {
    const invoice = await withPlatformBypass(() => db.invoice.findFirst({ where: { number: reference } }));
    if (!invoice || invoice.status !== "open") return response(1, "Invoice not found");
    if (Math.abs(Number(invoice.totalKes) - amount) > 0.01) return response(1, "Amount mismatch");
    return response(0, "Accepted");
  } catch (error) {
    console.error("[daraja c2b validation]", error);
    return response(1, "Unable to validate payment");
  }
}
