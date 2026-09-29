"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import { getSessionUser, markSessionMfaVerified } from "@/app/lib/auth";
import { confirmMfa, enrollMfa, verifyUserMfa } from "@/app/lib/platform/mfa";
import { recordAuditRequired } from "@/app/lib/platform/audit";

export type MfaState = {
  error?: string;
  secret?: string;
  otpauth?: string;
  recoveryCodes?: string[];
  success?: string;
};

export async function startMfaEnrollmentAction(): Promise<MfaState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.twoFactorEnabled) return { error: "Two-step verification is already enabled. Use your existing authenticator." };
  if (!await allowMfaAttempt(user.id)) return { error: "Too many attempts. Please wait a few minutes and try again." };
  const enrolled = await enrollMfa(user.id, user.email);
  return { secret: enrolled.secret, otpauth: enrolled.otpauth, recoveryCodes: enrolled.recoveryCodes };
}

export async function confirmMfaAction(_prev: MfaState, formData: FormData): Promise<MfaState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!await allowMfaAttempt(user.id)) return { error: "Too many attempts. Please wait a few minutes and try again." };
  const code = String(formData.get("code") || "");
  const ok = await confirmMfa(user.id, code);
  if (!ok) return { error: "Invalid authenticator code." };
  await recordAuditRequired({
    actorId: user.id,
    action: "security.mfa.enrolled",
    resource: "user",
    resourceId: user.id,
  });
  await markSessionMfaVerified(user.id);
  revalidatePath("/platform", "layout");
  revalidatePath("/admin", "layout");
  return { success: "Two-step verification is enabled. Your admin account is ready." };
}

export async function verifyStepUpAction(_prev: MfaState, formData: FormData): Promise<MfaState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!await allowMfaAttempt(user.id)) return { error: "Too many attempts. Please wait a few minutes and try again." };
  const code = String(formData.get("code") || "");
  const ok = await verifyUserMfa(user.id, code);
  if (!ok) return { error: "Invalid code." };
  await markSessionMfaVerified(user.id);
  revalidatePath("/platform", "layout");
  revalidatePath("/admin", "layout");
  return { success: "Verified. You can continue to your workspace." };
}

async function allowMfaAttempt(userId: string): Promise<boolean> {
  const result = await checkRateLimitAsync(`mfa:${userId}`, { limit: 10, windowMs: 5 * 60 * 1000, failClosed: true });
  return result.allowed;
}
