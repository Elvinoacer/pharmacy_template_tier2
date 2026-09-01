import "server-only";

import { createHash } from "crypto";
import { prismaUnscoped } from "@/app/lib/db";

export async function beginIdempotent(opts: {
  pharmacyId: string;
  key: string;
  method: string;
  path: string;
  body: unknown;
}) {
  const requestHash = createHash("sha256").update(JSON.stringify(opts.body ?? {})).digest("hex");
  const existing = await prismaUnscoped.idempotencyKey.findUnique({
    where: {
      pharmacyId_key_method_path: {
        pharmacyId: opts.pharmacyId,
        key: opts.key,
        method: opts.method,
        path: opts.path,
      },
    },
  });
  if (existing) {
    if (existing.requestHash !== requestHash) {
      return { conflict: true as const, replay: null };
    }
    if (existing.responseCode != null) {
      return { conflict: false as const, replay: existing };
    }
  }
  const row = existing ?? await prismaUnscoped.idempotencyKey.create({
    data: {
      pharmacyId: opts.pharmacyId,
      key: opts.key,
      method: opts.method,
      path: opts.path,
      requestHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return { conflict: false as const, replay: null, pending: row };
}

export async function completeIdempotent(id: string, status: number, body: unknown) {
  await prismaUnscoped.idempotencyKey.update({
    where: { id },
    data: { responseCode: status, responseBody: body as object },
  });
}
