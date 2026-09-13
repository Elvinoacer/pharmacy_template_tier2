import "server-only";

import { prismaUnscoped } from "@/app/lib/db";

export const VERIFICATION_DOCUMENT_UPLOADED_EVENT = "verification_document_uploaded";

export type VerificationDocumentKind = "license" | "business";

export type VerificationDocumentDraft = {
  reference: string;
  contentType: string | null;
  size: number | null;
  createdAt: Date;
};

export type VerificationDocumentDrafts = Record<VerificationDocumentKind, VerificationDocumentDraft | null>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isKind(value: unknown): value is VerificationDocumentKind {
  return value === "license" || value === "business";
}

/**
 * Verification uploads are durable immediately, before the surrounding dossier
 * is submitted. Rehydrate the newest upload for each document kind so a refresh
 * never makes a successful upload appear to have been lost.
 */
export async function loadLatestVerificationDocumentDrafts(
  pharmacyId: string,
): Promise<VerificationDocumentDrafts> {
  const rows = await prismaUnscoped.pharmacyOnboardingEvent.findMany({
    where: { pharmacyId, type: VERIFICATION_DOCUMENT_UPLOADED_EVENT },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { meta: true, createdAt: true },
  });

  const drafts: VerificationDocumentDrafts = { license: null, business: null };

  for (const row of rows) {
    const meta = asRecord(row.meta);
    const kind = meta.kind;
    const reference = typeof meta.reference === "string" ? meta.reference.trim() : "";
    if (!isKind(kind) || drafts[kind] || !reference) continue;

    const expectedPrefix = `r2-private://pharmacy-verification/${pharmacyId}/${kind}/`;
    if (!reference.startsWith(expectedPrefix)) continue;

    drafts[kind] = {
      reference,
      contentType: typeof meta.contentType === "string" ? meta.contentType : null,
      size: typeof meta.size === "number" && Number.isFinite(meta.size) ? meta.size : null,
      createdAt: row.createdAt,
    };

    if (drafts.license && drafts.business) break;
  }

  return drafts;
}
