import { NextResponse } from "next/server";
import { prismaUnscoped } from "@/app/lib/db";
import { requirePlatformAction } from "@/app/lib/platform/policy";
import { isPrivateR2Reference, readPrivateR2Object } from "@/app/lib/r2";
import { loadLatestVerificationProfile } from "@/app/lib/services/pharmacy-verification";
import {
  loadLatestVerificationDocumentDrafts,
  type VerificationDocumentKind,
} from "@/app/lib/services/pharmacy-verification-documents";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let reviewer: Awaited<ReturnType<typeof requirePlatformAction>>;
  try {
    reviewer = await requirePlatformAction(["super_admin"], { stepUp: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "forbidden";
    return NextResponse.json({ error: message }, { status: message === "MFA_REQUIRED" ? 401 : 403 });
  }

  const url = new URL(request.url);
  const pharmacyId = (url.searchParams.get("pharmacyId") || "").trim();
  const rawKind = (url.searchParams.get("kind") || "").trim();
  if (!pharmacyId || (rawKind !== "license" && rawKind !== "business")) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const kind: VerificationDocumentKind = rawKind;

  const [pharmacy, profileResult, drafts] = await Promise.all([
    prismaUnscoped.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { licenseDocumentUrl: true },
    }),
    loadLatestVerificationProfile(pharmacyId),
    loadLatestVerificationDocumentDrafts(pharmacyId),
  ]);
  if (!pharmacy) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const expectedPrefix = `r2-private://pharmacy-verification/${pharmacyId}/${kind}/`;
  const savedReference = kind === "license"
    ? pharmacy.licenseDocumentUrl
    : profileResult?.profile.businessDocumentUrl ?? null;
  const draftReference = drafts[kind]?.reference ?? null;

  const usableSavedReference =
    savedReference && isPrivateR2Reference(savedReference) && savedReference.startsWith(expectedPrefix)
      ? savedReference
      : null;
  const usableDraftReference =
    draftReference && isPrivateR2Reference(draftReference) && draftReference.startsWith(expectedPrefix)
      ? draftReference
      : null;

  const reference = usableSavedReference ?? usableDraftReference;
  const source = usableSavedReference ? "saved-dossier" : usableDraftReference ? "uploaded-draft" : null;

  if (!reference || !source) {
    return NextResponse.json({ error: "document_unavailable" }, { status: 404 });
  }

  const object = await readPrivateR2Object(reference);
  if (!object) return NextResponse.json({ error: "document_unavailable" }, { status: 404 });

  await prismaUnscoped.sensitiveAccessLog.create({
    data: {
      actorId: reviewer.id,
      pharmacyId,
      resource: "pharmacy_verification_document",
      resourceId: pharmacyId,
      purpose: `KYP ${kind} evidence review (${source})`,
    },
  });

  return new Response(new Uint8Array(object.body), {
    status: 200,
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `inline; filename="${kind}-verification-evidence"`,
      "X-Content-Type-Options": "nosniff",
      "X-Verification-Document-Source": source,
    },
  });
}
