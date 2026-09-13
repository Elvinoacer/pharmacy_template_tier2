import { NextResponse } from "next/server";
import { getSessionUser, markSessionMfaVerified } from "@/app/lib/auth";
import { verifyUserMfa } from "@/app/lib/platform/mfa";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import { recordAuditRequired } from "@/app/lib/platform/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED", message: "Sign in again to continue." }, { status: 401 });
  }
  if (!user.platformAdmin) {
    return NextResponse.json({ error: "FORBIDDEN", message: "Platform admin access is required." }, { status: 403 });
  }
  if (!user.twoFactorEnabled) {
    return NextResponse.json({ error: "MFA_REQUIRED", message: "Set up two-step verification before opening sensitive evidence." }, { status: 409 });
  }

  const limited = await checkRateLimitAsync(`mfa:${user.id}`, {
    limit: 10,
    windowMs: 5 * 60 * 1000,
    failClosed: true,
  });
  if (!limited.allowed) {
    return NextResponse.json({ error: "RATE_LIMITED", message: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
  }

  let code = "";
  try {
    const body = (await request.json()) as { code?: unknown };
    code = typeof body.code === "string" ? body.code.trim() : "";
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST", message: "Enter your authenticator or recovery code." }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "CODE_REQUIRED", message: "Enter your authenticator or recovery code." }, { status: 400 });
  }

  const ok = await verifyUserMfa(user.id, code);
  if (!ok) {
    return NextResponse.json({ error: "INVALID_CODE", message: "That code is invalid or expired. Enter the newest code from your authenticator." }, { status: 400 });
  }

  await markSessionMfaVerified(user.id);
  await recordAuditRequired({
    actorId: user.id,
    action: "security.mfa.step_up",
    resource: "user",
    resourceId: user.id,
    reason: "Sensitive pharmacy verification evidence access",
  });

  return NextResponse.json({ ok: true });
}
