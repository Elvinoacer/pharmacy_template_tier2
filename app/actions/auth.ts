"use server";

import { redirect } from "next/navigation";
import {
  AuthError,
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
  resetToken?: string;
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

  try {
    const { userId } = await registerCustomer({
      email,
      password,
      fullName,
      phone: phone || undefined,
      dateOfBirth: dateOfBirth || undefined,
    });
    await createSession(userId);
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

  const token = await createPasswordReset(email);
  // Demo mode: surface token so the flow is testable without email
  if (!token) {
    return {
      success: "If that email exists, a reset link has been prepared.",
    };
  }
  return {
    success: "Password reset ready (demo mode — use the link below).",
    resetToken: token,
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

  const ok = await resetPasswordWithToken(token, password);
  if (!ok) return { error: "Invalid or expired reset link." };

  return { success: "Password updated. You can sign in now." };
}
