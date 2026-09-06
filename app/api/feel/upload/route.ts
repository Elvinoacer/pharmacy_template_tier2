import { NextResponse } from "next/server";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import {
  isPrivateR2Configured,
  R2_MAX_BYTES,
  uploadPrivateImageToR2,
} from "@/app/lib/r2";
import { assertSessionAccess } from "@/app/lib/services/symptom-triage";

export const runtime = "nodejs";

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * POST /api/feel/upload
 * Multipart: file (image), sessionId, guestKey (for guests)
 * Sensitive symptom media is stored in a private R2 bucket. The returned
 * `url` is an internal private reference consumed by the chat API; it is not
 * a publicly fetchable object URL.
 */
export async function POST(req: Request) {
  const rl = await checkRateLimitAsync(`feel-upload:${clientIp(req)}`, {
    limit: 12,
    windowMs: 60_000,
    failClosed: true,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many uploads. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  if (!isPrivateR2Configured()) {
    return NextResponse.json(
      {
        error: "private_storage_not_configured",
        message:
          "Private health-media storage is not configured. You can still describe symptoms in text or contact the pharmacy directly.",
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

  const sessionId = String(form.get("sessionId") || "").trim();
  const guestKey = String(form.get("guestKey") || "").trim() || undefined;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const access = await assertSessionAccess({ sessionId, guestKey });
  if (access.error === "not_found") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (access.error === "forbidden") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "missing_file", message: 'Attach an image as form field "file".' },
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

  try {
    const result = await uploadPrivateImageToR2(file, {
      folder: `symptom-uploads/${sessionId}`,
    });
    return NextResponse.json({
      ok: true,
      // Backward-compatible response property consumed by the current client.
      url: result.reference,
      key: result.key,
      contentType: result.contentType,
      size: result.size,
    });
  } catch (err) {
    console.error("[feel upload]", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: "upload_failed", message }, { status: 400 });
  }
}
