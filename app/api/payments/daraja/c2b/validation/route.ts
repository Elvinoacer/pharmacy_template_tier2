import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { prismaUnscoped as db } from "@/app/lib/db";
import { withPlatformBypass } from "@/app/lib/tenant-context";
import { resolveDarajaCredentials } from "@/app/lib/platform/integrations";

export const runtime = "nodejs";

type C2BPayload = { BillRefNumber?: string; TransAmount?: string | number; BusinessShortCode?: string | number };

function authorized(request: Request) {
  const expected = process.env.DARAJA_C2B_WEBHOOK_SECRET?.trim();
  if (!expected) {
    return process.env.DARAJA_ENV?.trim().toLowerCase() !== "production";
  }
  const received = new URL(request.url).searchParams.get("token") || "";
  if (!received) return false;
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
  const merchant = await resolveDarajaCredentials(null);
  if (!merchant || String(body?.BusinessShortCode || "") !== merchant.shortcode) return response(1, "Merchant mismatch");

  try {
    const invoice = await withPlatformBypass(() =>
      db.invoice.findFirst({
        where: {
          OR: [
            { number: reference },
            { number: { equals: reference, mode: "insensitive" } },
            { id: reference },
          ],
        },
      }),
    );
    if (invoice) {
      if (invoice.status !== "open") return response(1, "Invoice not found or closed");
      if (Math.abs(Number(invoice.totalKes) - amount) > 0.01) return response(1, "Amount mismatch");
      return response(0, "Accepted");
    }

    return response(1, "Platform invoice not found");
  } catch (error) {
    console.error("[daraja c2b validation]", error);
    return response(1, "Unable to validate payment");
  }
}
