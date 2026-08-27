import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/app/lib/auth";
import {
  getChronicCareDashboardData,
  requestPrescriberChronicRenewal,
} from "@/app/lib/services/chronic-care";

export const runtime = "nodejs";

const RenewalSchema = z.object({
  prescriptionId: z.string().uuid(),
  additionalRefillsRequested: z.number().int().min(1).max(24).optional(),
  contactMethod: z.string().optional(),
  inquiryDetails: z.string().optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role === "customer" || user.role === "caregiver") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const data = await getChronicCareDashboardData();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role === "customer" || user.role === "caregiver") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = RenewalSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "invalid_body", details: err }, { status: 400 });
  }

  try {
    const log = await requestPrescriberChronicRenewal({
      prescriptionId: body.prescriptionId,
      additionalRefillsRequested: body.additionalRefillsRequested,
      contactMethod: body.contactMethod,
      inquiryDetails: body.inquiryDetails,
      staffId: user.id,
    });

    return NextResponse.json({ ok: true, log });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to initiate renewal" },
      { status: 500 },
    );
  }
}
