import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, requirePlatformAdmin } from "@/app/lib/auth";
import { updatePlatformMedication, getPlatformMedicationById } from "@/app/lib/services/platform-medication-library";

export const runtime = "nodejs";

const UpdateBody = z.object({
  name: z.string().min(1).optional(),
  genericName: z.string().min(1).optional(),
  brandName: z.string().optional().nullable(),
  strengthDisplay: z.string().optional().nullable(),
  strengthValue: z.number().optional().nullable(),
  strengthUnit: z.string().optional().nullable(),
  packSize: z.string().optional().nullable(),
  dosageFormId: z.string().uuid().optional().nullable(),
  routeId: z.string().uuid().optional().nullable(),
  pregnancyCategoryId: z.string().uuid().optional().nullable(),
  manufacturerId: z.string().uuid().optional().nullable(),
  countryOfOrigin: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  category: z.string().optional(),
  description: z.string().optional().nullable(),
  indications: z.string().optional().nullable(),
  dosage: z.string().optional().nullable(),
  sideEffects: z.string().optional().nullable(),
  contraindications: z.string().optional().nullable(),
  storage: z.string().optional().nullable(),
  clinicalNotes: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  imageUrls: z.string().optional().nullable(),
  controlledDrug: z.boolean().optional(),
  controlledDrugSchedule: z.string().optional().nullable(),
  pediatricUse: z.boolean().optional(),
  requiresRefrigeration: z.boolean().optional(),
  status: z.enum(["active", "needs_review", "deprecated", "archived"]).optional(),
});

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Props) {
  const user = await getSessionUser();
  if (!user || !user.platformAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const result = await getPlatformMedicationById(id);
  if (!result.master) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...result });
}

export async function PATCH(req: Request, { params }: Props) {
  const user = await getSessionUser();
  if (!user || !user.platformAdmin) {
    return NextResponse.json({ error: "forbidden", message: "Platform admin access required." }, { status: 403 });
  }

  try {
    requirePlatformAdmin(user);
  } catch (err: any) {
    return NextResponse.json({ error: "unauthorized", message: err.message }, { status: 401 });
  }

  const { id } = await params;

  let body: z.infer<typeof UpdateBody>;
  try {
    body = UpdateBody.parse(await req.json());
  } catch (err: any) {
    return NextResponse.json({ error: "invalid_request", issues: err.issues }, { status: 400 });
  }

  try {
    const updated = await updatePlatformMedication({
      id,
      data: body,
      actorId: user.id,
    });

    return NextResponse.json({ ok: true, medication: updated });
  } catch (err: any) {
    console.error("[platform medication PATCH]", err);
    return NextResponse.json({ error: "update_failed", message: err.message || "Failed to update medication." }, { status: 500 });
  }
}
