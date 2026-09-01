import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatePos } from "@/app/lib/platform/integrations";
import { beginIdempotent, completeIdempotent } from "@/app/lib/platform/idempotency";
import { enqueueJob } from "@/app/lib/platform/jobs";
import { runPosSync } from "@/app/lib/platform/pos-sync";

export const runtime = "nodejs";

const MedicationInput = z.object({
  sku: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().optional(),
  category: z.string().default("general"),
  description: z.string().optional(),
  indications: z.string().optional(),
  dosage: z.string().optional(),
  sideEffects: z.string().optional(),
  contraindications: z.string().optional(),
  storage: z.string().optional(),
  price: z.coerce.number().min(0).default(0),
  stockQty: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(10),
  imageUrl: z.string().optional(),
  overTheCounter: z.boolean().default(false),
  publicListing: z.boolean().default(false),
  prescriptionRequired: z.boolean().default(true),
  active: z.boolean().default(true),
  version: z.coerce.number().int().optional(),
});

const Body = z.object({
  tenant: z.string().optional(),
  branchId: z.string().uuid().optional(),
  medications: z.array(MedicationInput).min(1).max(200),
});

export async function POST(req: Request) {
  const auth = await authenticatePos(req.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const idempotencyKey = req.headers.get("idempotency-key")?.trim();
  let pendingIdempotencyId: string | null = null;
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "invalid_body", detail: e instanceof Error ? e.message : undefined }, { status: 400 });
  }

  if (parsed.tenant && parsed.tenant !== auth.pharmacyId) {
    return NextResponse.json({ error: "tenant_mismatch" }, { status: 403 });
  }

  if (idempotencyKey) {
    const gate = await beginIdempotent({
      pharmacyId: auth.pharmacyId,
      key: idempotencyKey,
      method: "POST",
      path: "/api/integrations/pos",
      body: parsed,
    });
    if (gate.conflict) return NextResponse.json({ error: "idempotency_conflict" }, { status: 409 });
    if (gate.replay) {
      return NextResponse.json(gate.replay.responseBody ?? { ok: true }, { status: gate.replay.responseCode ?? 200 });
    }
    pendingIdempotencyId = gate.pending?.id ?? null;
  }

  if (parsed.medications.length > 40) {
    const job = await enqueueJob({
      type: "pos.sync",
      pharmacyId: auth.pharmacyId,
      payload: { medications: parsed.medications, branchId: parsed.branchId ?? null },
    });
    const queued = { ok: true, queued: true, jobId: job.id, count: parsed.medications.length };
    if (pendingIdempotencyId) await completeIdempotent(pendingIdempotencyId, 202, queued);
    return NextResponse.json(queued, { status: 202 });
  }

  const result = await runPosSync(auth.pharmacyId, parsed.medications, parsed.branchId);

  if (pendingIdempotencyId) {
    await completeIdempotent(pendingIdempotencyId, 200, result);
  }

  return NextResponse.json(result);
}
