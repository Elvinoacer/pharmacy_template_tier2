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

export async function POST(req: Request) {
  const rl = await checkRateLimitAsync(`feel-upload:${clientIp(req)}`, {
    limit: 12,
    windowMs: 60_000,
    failClosed: true,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: `You're uploading images too quickly. Try again in ${rl.retryAfterSeconds}s.`,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  if (!isPrivateR2Configured()) {
    console.error("[feel upload] private symptom-media storage is unavailable");
    return NextResponse.json(
      {
        error: "upload_unavailable",
        message: "Image upload is temporarily unavailable. You can still describe your symptoms in text or contact the pharmacy directly.",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_request", message: "We couldn't read that upload. Choose the image again and retry." },
      { status: 400 },
    );
  }

  const sessionId = String(form.get("sessionId") || "").trim();
  const guestKey = String(form.get("guestKey") || "").trim() || undefined;
  if (!sessionId) {
    return NextResponse.json(
      { error: "missing_session", message: "This symptom conversation has expired. Start a new symptom check and try again." },
      { status: 400 },
    );
  }

  const access = await assertSessionAccess({ sessionId, guestKey });
  if (access.error === "not_found") {
    return NextResponse.json(
      { error: "not_found", message: "We couldn't find this symptom conversation. Start a new one and try again." },
      { status: 404 },
    );
  }
  if (access.error === "forbidden") {
    return NextResponse.json(
      { error: "forbidden", message: "You no longer have access to this symptom conversation." },
      { status: 403 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "missing_file", message: "Choose an image before uploading." },
      { status: 400 },
    );
  }

  if (file.size > R2_MAX_BYTES) {
    return NextResponse.json(
      {
        error: "file_too_large",
        message: `This image is too large. Choose one smaller than ${R2_MAX_BYTES / (1024 * 1024)} MB.`,
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
      url: result.reference,
      key: result.key,
      contentType: result.contentType,
      size: result.size,
    });
  } catch (err) {
    console.error("[feel upload]", err);
    return NextResponse.json(
      {
        error: "upload_failed",
        message: "We couldn't upload this image. Check the file type and size, then try again.",
      },
      { status: 400 },
    );
  }
}
