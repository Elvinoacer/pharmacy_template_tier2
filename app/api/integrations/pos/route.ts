import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatePos } from "@/app/lib/platform/integrations";
import { beginIdempotent, completeIdempotent } from "@/app/lib/platform/idempotency";
import { enqueueJob } from "@/app/lib/platform/jobs";
import { runPosSync } from "@/app/lib/platform/pos-sync";

export const runtime = "nodejs";

const MedicationInput = z.object({
  sku: z.string().trim().min(1).max(120).optional(),
  name: z.string().trim().min(1).max(240),
  slug: z.string().trim().min(1).max(240).optional(),
  category: z.string().trim().min(1).max(120).default("general"),
  description: z.string().max(4000).optional(),
  indications: z.string().max(4000).optional(),
  dosage: z.string().max(2000).optional(),
  sideEffects: z.string().max(4000).optional(),
  contraindications: z.string().max(4000).optional(),
  storage: z.string().max(2000).optional(),
  price: z.coerce.number().finite().min(0).max(100_000_000).default(0),
  stockQty: z.coerce.number().int().min(0).max(10_000_000).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).max(10_000_000).default(10),
  imageUrl: z.string().url().max(2048).optional(),
  overTheCounter: z.boolean().default(false),
  publicListing: z.boolean().default(false),
  prescriptionRequired: z.boolean().default(true),
  active: z.boolean().default(true),
  // Optional optimistic platform version returned by the previous integration
  // snapshot. A mismatch is a conflict rather than a blind overwrite.
  version: z.coerce.number().int().min(1).optional(),
});

function fallbackSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const Body = z.object({
  tenant: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  medications: z.array(MedicationInput).min(1).max(200),
}).superRefine((body, ctx) => {
  const seen = new Set<string>();
  for (let i = 0; i < body.medications.length; i++) {
    const med = body.medications[i];
    const identity = med.sku
      ? `sku:${med.sku.toLowerCase()}`
      : `slug:${(med.slug || fallbackSlug(med.name)).toLowerCase()}`;
    if (seen.has(identity)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["medications", i],
        message: `Duplicate POS medication identity: ${identity}`,
      });
    } else {
      seen.add(identity);
    }
  }
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
    return NextResponse.json(
      { error: "invalid_body", detail: e instanceof Error ? e.message : undefined },
      { status: 400 },
    );
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

  // Large imports are asynchronous so an HTTP/serverless request is never held
  // open for hundreds of database writes.
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
