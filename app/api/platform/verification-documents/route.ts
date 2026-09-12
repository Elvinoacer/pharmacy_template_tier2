import { NextResponse } from "next/server";
import { prismaUnscoped } from "@/app/lib/db";
import { requirePlatformAction } from "@/app/lib/platform/policy";
import { isPrivateR2Reference, readPrivateR2Object } from "@/app/lib/r2";
import { loadLatestVerificationProfile } from "@/app/lib/services/pharmacy-verification";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requirePlatformAction(["super_admin"], { stepUp: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "forbidden";
    return NextResponse.json({ error: message }, { status: message === "MFA_REQUIRED" ? 401 : 403 });
  }

  const url = new URL(request.url);
  const pharmacyId = (url.searchParams.get("pharmacyId") || "").trim();
  const kind = (url.searchParams.get("kind") || "").trim();
  if (!pharmacyId || !["license", "business"].includes(kind)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const pharmacy = await prismaUnscoped.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: { licenseDocumentUrl: true },
  });
  if (!pharmacy) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let reference = pharmacy.licenseDocumentUrl;
  if (kind === "business") {
    const profile = await loadLatestVerificationProfile(pharmacyId);
    reference = profile?.profile.businessDocumentUrl ?? null;
  }

  if (!reference || !isPrivateR2Reference(reference)) {
    return NextResponse.json({ error: "document_unavailable" }, { status: 404 });
  }
  const expectedPrefix = `r2-private://pharmacy-verification/${pharmacyId}/${kind}/`;
  if (!reference.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "invalid_document_reference" }, { status: 403 });
  }

  const object = await readPrivateR2Object(reference);
  if (!object) return NextResponse.json({ error: "document_unavailable" }, { status: 404 });

  return new Response(new Uint8Array(object.body), {
    status: 200,
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `inline; filename="${kind}-verification-evidence"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
