import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import {
  isPrivateR2Configured,
  R2_MAX_BYTES,
  uploadPrivateImageToR2,
} from "@/app/lib/r2";

export const runtime = "nodejs";

const ALLOWED_KINDS = new Set(["license", "business"]);

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
        message: "Private document storage is not configured. Configure R2_PRIVATE_BUCKET_NAME before accepting regulatory documents.",
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
  const kind = String(form.get("kind") || "").trim();
  if (!pharmacyId || !ALLOWED_KINDS.has(kind)) {
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

    await prismaUnscoped.pharmacyOnboardingEvent.create({
      data: {
        pharmacyId,
        actorId: user.id,
        type: "verification_document_uploaded",
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
    });
  } catch (err) {
    console.error("[verification upload]", err);
    return NextResponse.json(
      { error: "upload_failed", message: err instanceof Error ? err.message : "Upload failed." },
      { status: 400 },
    );
  }
}
