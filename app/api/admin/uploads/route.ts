import { NextResponse } from "next/server";
import { getSessionUser, isStaff, writeAuditLog } from "@/app/lib/auth";
import {
  isR2Configured,
  R2_MAX_BYTES,
  uploadToR2,
} from "@/app/lib/r2";

export const runtime = "nodejs";

/**
 * POST /api/admin/uploads
 *
 * Multipart form fields:
 *   file   — image file (required)
 *   folder — optional key prefix (default "uploads"), e.g. "medications", "gallery"
 *
 * Staff-only. Returns { ok, url, key, contentType, size }.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      {
        error: "r2_not_configured",
        message:
          "Cloudflare R2 is not configured. Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL to .env.local.",
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

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "missing_file", message: "Attach an image as form field \"file\"." },
      { status: 400 },
    );
  }

  if (file.size > R2_MAX_BYTES) {
    return NextResponse.json(
      {
        error: "file_too_large",
        message: `Max file size is ${R2_MAX_BYTES / (1024 * 1024)} MB.`,
      },
      { status: 413 },
    );
  }

  const folder = String(form.get("folder") || "uploads");

  try {
    const result = await uploadToR2(file, { folder });
    await writeAuditLog(user.id, "image_uploaded", "r2", result.key, {
      url: result.url,
      contentType: result.contentType,
      size: result.size,
      folder,
    });

    return NextResponse.json({
      ok: true,
      url: result.url,
      key: result.key,
      contentType: result.contentType,
      size: result.size,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed.";
    console.error("[api/admin/uploads]", e);
    return NextResponse.json({ error: "upload_failed", message }, { status: 400 });
  }
}

/** Lightweight readiness check for the upload UI. */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    configured: isR2Configured(),
    maxBytes: R2_MAX_BYTES,
  });
}
