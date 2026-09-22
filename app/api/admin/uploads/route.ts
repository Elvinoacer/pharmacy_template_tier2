import { NextResponse } from "next/server";
import { getSessionUser, isStaff, writeAuditLog } from "@/app/lib/auth";
import {
  isR2Configured,
  R2_MAX_BYTES,
  uploadToR2,
} from "@/app/lib/r2";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || (!isStaff(user.role) && !user.platformAdmin)) {
    return NextResponse.json(
      { error: "forbidden", message: "You do not have permission to upload files." },
      { status: 403 },
    );
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      {
        error: "upload_unavailable",
        message: "File uploads are temporarily unavailable. Please try again later.",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_request", message: "We couldn't read the upload. Choose the file again and retry." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "missing_file", message: "Choose an image to upload." },
      { status: 400 },
    );
  }

  if (file.size > R2_MAX_BYTES) {
    return NextResponse.json(
      {
        error: "file_too_large",
        message: `This file is too large. Choose an image smaller than ${R2_MAX_BYTES / (1024 * 1024)} MB.`,
      },
      { status: 413 },
    );
  }

  const folder = String(form.get("folder") || "uploads");

  try {
    const result = await uploadToR2(file, { folder });
    await writeAuditLog(user.id, "image_uploaded", "r2", undefined, {
      key: result.key,
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
    console.error("[api/admin/uploads]", e);
    return NextResponse.json(
      {
        error: "upload_failed",
        message: "We couldn't upload this file. Check the file type and size, then try again.",
      },
      { status: 400 },
    );
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user || (!isStaff(user.role) && !user.platformAdmin)) {
    return NextResponse.json(
      { error: "forbidden", message: "You do not have permission to view upload settings." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    configured: isR2Configured(),
    maxBytes: R2_MAX_BYTES,
  });
}
