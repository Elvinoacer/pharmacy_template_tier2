import { NextResponse } from "next/server";

import { requirePlatformAction } from "@/app/lib/platform/policy";
import { registerC2BUrls } from "@/app/lib/services/daraja-operations";

export const runtime = "nodejs";

export async function POST() {
  try {
    await requirePlatformAction(["super_admin", "billing_admin"], { stepUp: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "forbidden";
    return NextResponse.json({ ok: false, error: message }, { status: message === "MFA_REQUIRED" || message === "STEP_UP_REQUIRED" ? 401 : 403 });
  }

  const result = await registerC2BUrls();
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}
