import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import {
  isPrivateR2Configured,
  isPrivateR2Reference,
  readPrivateR2Object,
  R2_MAX_BYTES,
  uploadPrivateImageToR2,
} from "@/app/lib/r2";
import { loadLatestVerificationProfile } from "@/app/lib/services/pharmacy-verification";
import {
  loadLatestVerificationDocumentDrafts,
  VERIFICATION_DOCUMENT_UPLOADED_EVENT,
  type VerificationDocumentKind,
} from "@/app/lib/services/pharmacy-verification-documents";

export const runtime = "nodejs";

const ALLOWED_KINDS = new Set<VerificationDocumentKind>(["license", "business"]);

function parseKind(value: string): VerificationDocumentKind | null {
  return ALLOWED_KINDS.has(value as VerificationDocumentKind)
    ? (value as VerificationDocumentKind)
    : null;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const pharmacyId = (url.searchParams.get("pharmacyId") || "").trim();
  const kind = parseKind((url.searchParams.get("kind") || "").trim());
  if (!pharmacyId || !kind) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const pharmacy = await prismaUnscoped.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: { ownerUserId: true, licenseDocumentUrl: true },
  });
  if (!pharmacy) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (pharmacy.ownerUserId !== user.id && !user.platformAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const drafts = await loadLatestVerificationDocumentDrafts(pharmacyId);
  let reference = drafts[kind]?.reference ?? null;

  // Backward compatibility for applications saved before draft rehydration was added.
  if (!reference && kind === "license") reference = pharmacy.licenseDocumentUrl;
  if (!reference && kind === "business") {
    const profile = await loadLatestVerificationProfile(pharmacyId);
    reference = profile?.profile.businessDocumentUrl ?? null;
  }

  const expectedPrefix = `r2-private://pharmacy-verification/${pharmacyId}/${kind}/`;
  if (!reference || !isPrivateR2Reference(reference) || !reference.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "document_unavailable" }, { status: 404 });
  }

  const object = await readPrivateR2Object(reference);
  if (!object) return NextResponse.json({ error: "document_unavailable" }, { status: 404 });

  return new Response(new Uint8Array(object.body), {
    status: 200,
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      "Content-Disposition": `inline; filename="${kind}-verification-evidence"`,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = await checkRateLimitAsync(`pharmacy-verification-upload:${user.id}`, {
    limit: 12,
    windowMs: 60_000,
    failClosed: true,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: `Too many uploads. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  if (!isPrivateR2Configured()) {
    return NextResponse.json(
      {
        error: "private_storage_not_configured",
        message: "Secure document storage is unavailable. Check the configured R2 credentials and application secret.",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_multipart" }, { status: 400 });
  }

  const pharmacyId = String(form.get("pharmacyId") || "").trim();
  const kind = parseKind(String(form.get("kind") || "").trim());
  if (!pharmacyId || !kind) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const pharmacy = await prismaUnscoped.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: { ownerUserId: true, status: true },
  });
  if (!pharmacy) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (pharmacy.ownerUserId !== user.id && !user.platformAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!["draft", "needs_info"].includes(pharmacy.status)) {
    return NextResponse.json(
      { error: "locked", message: "Documents cannot be changed while this application is in review." },
      { status: 409 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "missing_file", message: "Attach a JPEG, PNG or WebP image." },
      { status: 400 },
    );
  }
  if (file.size > R2_MAX_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", message: `Maximum file size is ${R2_MAX_BYTES / (1024 * 1024)} MB.` },
      { status: 413 },
    );
  }

  try {
    const result = await uploadPrivateImageToR2(file, {
      folder: `pharmacy-verification/${pharmacyId}/${kind}`,
    });

    // This event is the durable draft pointer. The surrounding dossier does not
    // need to be submitted for a successful upload to survive a page refresh.
    await prismaUnscoped.pharmacyOnboardingEvent.create({
      data: {
        pharmacyId,
        actorId: user.id,
        type: VERIFICATION_DOCUMENT_UPLOADED_EVENT,
        message: kind === "license" ? "PPB licence evidence uploaded" : "Business-registration evidence uploaded",
        meta: {
          kind,
          reference: result.reference,
          contentType: result.contentType,
          size: result.size,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      reference: result.reference,
      contentType: result.contentType,
      size: result.size,
      previewUrl: `/api/onboard/verification-documents?pharmacyId=${encodeURIComponent(pharmacyId)}&kind=${kind}`,
    });
  } catch (err) {
    console.error("[verification upload]", err);
    return NextResponse.json(
      { error: "upload_failed", message: err instanceof Error ? err.message : "Upload failed." },
      { status: 400 },
    );
  }
}
