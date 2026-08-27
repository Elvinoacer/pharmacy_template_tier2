import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/app/lib/auth";
import {
  getPendingFollowUpOutreach,
  logFollowUpCall,
  getFollowUpHistory,
  type FollowUpCallReason,
  type FollowUpCallOutcome,
  type AdherenceBarrier,
  type ClinicalAction,
} from "@/app/lib/services/adherence-outreach";

export const runtime = "nodejs";

const LogCallSchema = z.object({
  customerId: z.string().uuid(),
  prescriptionId: z.string().uuid().optional(),
  reason: z.enum([
    "low_adherence",
    "missed_dose",
    "refill_lapse",
    "med_sync",
    "side_effects",
    "routine_checkin",
  ]),
  callOutcome: z.enum([
    "reached_patient",
    "reached_caregiver",
    "voicemail",
    "busy_no_answer",
    "wrong_number",
    "refused",
  ]),
  barrierIdentified: z
    .enum([
      "side_effects",
      "cost",
      "regimen_complexity",
      "forgetfulness",
      "feeling_better",
      "transport",
      "none",
      "other",
    ])
    .optional(),
  clinicalAction: z.enum([
    "education",
    "adjusted_schedule",
    "enrolled_sync",
    "prescriber_consult",
    "generic_substitution",
    "scheduled_followup",
    "none",
  ]),
  notes: z.string().optional(),
  nextFollowUpDate: z.string().optional(), // YYYY-MM-DD
  sendSummaryNotification: z.boolean().optional(),
});

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role === "customer" || user.role === "caregiver") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;
  const reason = searchParams.get("reason") || undefined;
  const customerId = searchParams.get("customerId") || undefined;

  const [queue, history] = await Promise.all([
    getPendingFollowUpOutreach({ query: q, reason }),
    getFollowUpHistory({ customerId, limit: 30 }),
  ]);

  return NextResponse.json({ queue, history });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role === "customer" || user.role === "caregiver") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = LogCallSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "invalid_body", details: err }, { status: 400 });
  }

  try {
    const nextDate = body.nextFollowUpDate ? new Date(body.nextFollowUpDate + "T00:00:00Z") : null;

    const followUp = await logFollowUpCall({
      customerId: body.customerId,
      prescriptionId: body.prescriptionId,
      reason: body.reason as FollowUpCallReason,
      callOutcome: body.callOutcome as FollowUpCallOutcome,
      barrierIdentified: body.barrierIdentified as AdherenceBarrier | undefined,
      clinicalAction: body.clinicalAction as ClinicalAction,
      notes: body.notes,
      nextFollowUpDate: nextDate,
      sendSummaryNotification: body.sendSummaryNotification ?? true,
      staffId: user.id,
    });

    return NextResponse.json({ ok: true, followUp });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to log outreach call" },
      { status: 500 },
    );
  }
}
