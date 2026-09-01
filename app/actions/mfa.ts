"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
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
  const enrolled = await enrollMfa(user.id, user.email);
  return { secret: enrolled.secret, otpauth: enrolled.otpauth, recoveryCodes: enrolled.recoveryCodes };
}

export async function confirmMfaAction(_prev: MfaState, formData: FormData): Promise<MfaState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const code = String(formData.get("code") || "");
  const ok = await confirmMfa(user.id, code);
  if (!ok) return { error: "Invalid authenticator code." };
  await recordAuditRequired({
    actorId: user.id,
    action: "security.mfa.enrolled",
    resource: "user",
    resourceId: user.id,
  });
  return { success: "Two-factor authentication is now enabled." };
}

export async function verifyStepUpAction(_prev: MfaState, formData: FormData): Promise<MfaState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const code = String(formData.get("code") || "");
  const ok = await verifyUserMfa(user.id, code);
  if (!ok) return { error: "Invalid code." };
  return { success: "Reauthenticated." };
}
