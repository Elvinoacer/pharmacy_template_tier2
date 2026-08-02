"use server";

import { redirect } from "next/navigation";
import { checkRateLimit } from "@/app/lib/rate-limit";
import { getRequestMeta } from "@/app/lib/request-meta";
import { emailVerificationBody, passwordResetBody, sendDelivery } from "@/app/lib/services/delivery";
import {
  AuthError,
  createEmailVerification,
  createPasswordReset,
  destroySession,
  loginWithPassword,
  registerCustomer,
  resetPasswordWithToken,
  createSession,
  writeAuditLog,
} from "@/app/lib/auth";
import { isStaff } from "@/app/lib/auth";

export type AuthActionState = {
  error?: string;
  success?: string;
};

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") || "").trim();

  if (!email || !password || !fullName) {
    return { error: "Name, email, and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const meta = await getRequestMeta();
  const limited = checkRateLimit(`register:${meta.ip}:${email.toLowerCase()}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.allowed) {
    return { error: `Too many registration attempts. Try again in ${limited.retryAfterSeconds} seconds.` };
  }

  try {
    const { userId } = await registerCustomer({
      email,
      password,
      fullName,
      phone: phone || undefined,
      dateOfBirth: dateOfBirth || undefined,
    });
    await createSession(userId);
    const verifyToken = await createEmailVerification(userId);
    const verification = await sendDelivery({
      channel: "email",
      recipient: { email },
      subject: "Verify your Aether Pharmacy email",
      body: emailVerificationBody(verifyToken),
    });
    if (verification.status === "failed") {
      console.error("[email verification delivery]", verification.error);
    }
    await writeAuditLog(userId, "register", "user", userId);
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    console.error(e);
    return { error: "Could not create account. Please try again." };
  }

  redirect("/portal");
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "").trim();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const meta = await getRequestMeta();
  const ipLimit = checkRateLimit(`login:ip:${meta.ip}`, { limit: 20, windowMs: 15 * 60 * 1000 });
  const accountLimit = checkRateLimit(`login:account:${email.toLowerCase()}`, {
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });
  if (!ipLimit.allowed || !accountLimit.allowed) {
    return { error: "Too many sign-in attempts. Please wait before trying again." };
  }

  try {
    const user = await loginWithPassword(email, password);
    await writeAuditLog(user.id, "login", "user", user.id);

    if (next.startsWith("/")) redirect(next);
    if (isStaff(user.role)) redirect("/admin");
    redirect("/portal");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    console.error(e);
    return { error: "Login failed. Please try again." };
  }
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "Email is required." };

  const meta = await getRequestMeta();
  const limited = checkRateLimit(`forgot:${meta.ip}:${email.toLowerCase()}`, {
    limit: 4,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.allowed) {
    return { error: "Too many reset requests. Please wait before trying again." };
  }

  const token = await createPasswordReset(email);
  if (token) {
    const result = await sendDelivery({
      channel: "email",
      recipient: { email },
      subject: "Reset your Aether Pharmacy password",
      body: passwordResetBody(token),
    });
    if (result.status === "failed") {
      console.error("[password reset delivery]", result.error);
    }
  }

  return {
    success: "If that email exists, a reset link has been sent.",
  };
}

export async function resetPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!token || !password) return { error: "Token and password are required." };
  if (password !== confirm) return { error: "Passwords do not match." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const meta = await getRequestMeta();
  const limited = checkRateLimit(`reset:${meta.ip}`, { limit: 8, windowMs: 60 * 60 * 1000 });
  if (!limited.allowed) return { error: "Too many reset attempts. Please wait before trying again." };

  const ok = await resetPasswordWithToken(token, password);
  if (!ok) return { error: "Invalid or expired reset link." };

  return { success: "Password updated. You can sign in now." };
}
