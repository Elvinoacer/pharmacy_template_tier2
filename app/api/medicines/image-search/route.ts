import { NextResponse } from "next/server";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import { searchMedicinesByImage } from "@/app/lib/services/medication-image-search";

export const runtime = "nodejs";

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * POST /api/medicines/image-search
 * Multipart field: `image` (JPEG/PNG/WebP ≤ 5MB)
 *
 * Flow: upload → Groq vision identifies pack text → match public PharmacyInventory.
 * Returns the same catalog card shape used on /medicines.
 */
export async function POST(req: Request) {
  const rl = await checkRateLimitAsync(`med-image-search:${clientIp(req)}`, {
    limit: 8,
    windowMs: 60_000,
    failClosed: true,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message: `Easy there — photo search needs a short breather. Try again in ${rl.retryAfterSeconds}s.`,
      },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_multipart",
        message: "We couldn’t read that upload. Please try another photo.",
      },
      { status: 400 },
    );
  }

  const file = form.get("image") ?? form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_file",
        message: "Please choose a clear photo of the medicine pack or label.",
      },
      { status: 400 },
    );
  }

  const result = await searchMedicinesByImage(file);

  if (!result.ok) {
    const status =
      result.error === "ai_not_configured"
        ? 503
        : result.error === "file_too_large"
          ? 413
          : result.error === "search_failed"
            ? 502
            : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
