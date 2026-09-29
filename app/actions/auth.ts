"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import { getRequestMeta } from "@/app/lib/request-meta";
import { publicErrorMessage } from "@/app/lib/public-error";
import { emailVerificationBody, passwordResetBody, sendDelivery } from "@/app/lib/services/delivery";
import { validateCsrfToken } from "@/app/lib/csrf";
import {
  AuthError,
  createEmailVerification,
  createPasswordReset,
  destroySession,
  isStaff,
  loginWithPassword,
  registerCustomer,
  resetPasswordWithToken,
  createSession,
} from "@/app/lib/auth";
import { recordAudit } from "@/app/lib/platform/audit";
import { validatePassword } from "@/app/lib/password";
import { resolvePostLoginPath } from "@/app/lib/session-claim";

export type AuthActionState = {
  error?: string;
  success?: string;
};

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const csrfToken = String(formData.get("csrfToken") || "");
  try {
    await validateCsrfToken(csrfToken);
  } catch {
    return { error: "This form has expired. Refresh the page and try again." };
  }

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") || "").trim();

  if (!email || !password || !fullName) {
    return { error: "Name, email, and password are required." };
  }
  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  const meta = await getRequestMeta();
  const limited = await checkRateLimitAsync(`register:${meta.ip}:${email.toLowerCase()}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
    failClosed: true,
  });
  if (!limited.allowed) {
    return {
      error: limited.degraded
        ? "Registration is temporarily unavailable. Please try again shortly."
        : `Too many registration attempts. Try again in ${limited.retryAfterSeconds} seconds.`,
    };
  }

  let userId: string | null = null;
  try {
    const created = await registerCustomer({
      email,
      password,
      fullName,
      phone: phone || undefined,
      dateOfBirth: dateOfBirth || undefined,
    });
    userId = created.userId;
    await createSession(userId, { ip: meta.ip, userAgent: meta.userAgent });
    const verifyToken = await createEmailVerification(userId);
    const verification = await sendDelivery({
      channel: "email",
      recipient: { email },
      subject: "Verify your Afyvia Pharmacy email",
      body: emailVerificationBody(verifyToken),
    });
    if (verification.status === "failed") {
      console.error("[email verification delivery]", verification.error);
    }
    await recordAudit({ actorId: userId, action: "register", resource: "user", resourceId: userId });
  } catch (e) {
    if (isRedirectError(e)) throw e;
    if (e instanceof AuthError) {
      return { error: publicErrorMessage(e, "We couldn't create your account. Check the details and try again.") };
    }
    console.error("[registerAction]", e);
    return { error: "We couldn't create your account right now. Please try again." };
  }

  redirect(resolvePostLoginPath({ role: "customer", customerId: userId }, String(formData.get("next") || "")));
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const csrfToken = String(formData.get("csrfToken") || "");
  try {
    await validateCsrfToken(csrfToken);
  } catch {
    return { error: "This sign-in form has expired. Refresh the page and try again." };
  }

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "").trim();

  if (!email || !password) return { error: "Email and password are required." };

  const meta = await getRequestMeta();
  const ipLimit = await checkRateLimitAsync(`login:ip:${meta.ip}`, {
    limit: 20,
    windowMs: 15 * 60 * 1000,
    failClosed: true,
  });
  const accountLimit = await checkRateLimitAsync(`login:account:${email.toLowerCase()}`, {
    limit: 8,
    windowMs: 15 * 60 * 1000,
    failClosed: true,
  });
  if (!ipLimit.allowed || !accountLimit.allowed) {
    const degraded = ipLimit.degraded || accountLimit.degraded;
    return {
      error: degraded
        ? "Sign-in is temporarily unavailable. Please try again shortly."
        : "Too many sign-in attempts. Please wait before trying again.",
    };
  }

  let postLoginPath: string | null = null;
  try {
    const user = await loginWithPassword(email, password);
    await recordAudit({ actorId: user.id, action: "login", resource: "user", resourceId: user.id });
    if (user.twoFactorEnabled && !user.mfaVerifiedAt) {
      if (user.platformAdmin) {
        postLoginPath = "/platform/security?mfa=required";
      } else if (isStaff(user.role)) {
        const candidate = resolvePostLoginPath(
          { role: user.role, customerId: user.customerId, platformAdmin: user.platformAdmin },
          next || null,
        );
        postLoginPath = candidate.startsWith("/admin") ? candidate : "/admin";
      } else {
        postLoginPath = resolvePostLoginPath(
          { role: user.role, customerId: user.customerId, platformAdmin: user.platformAdmin },
          next || null,
        );
      }
    } else {
      postLoginPath = resolvePostLoginPath(
        { role: user.role, customerId: user.customerId, platformAdmin: user.platformAdmin },
        next || null,
      );
    }
  } catch (e) {
    if (isRedirectError(e)) throw e;
    if (e instanceof AuthError) {
      return { error: publicErrorMessage(e, "We couldn't sign you in. Check your email and password and try again.") };
    }
    console.error("[loginAction]", e);
    return { error: "We couldn't sign you in right now. Please try again." };
  }

  redirect(postLoginPath ?? "/portal");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const csrfToken = String(formData.get("csrfToken") || "");
  try {
    await validateCsrfToken(csrfToken);
  } catch {
    return { error: "This form has expired. Refresh the page and try again." };
  }

  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "Email is required." };

  const meta = await getRequestMeta();
  const limited = await checkRateLimitAsync(`forgot:${meta.ip}:${email.toLowerCase()}`, {
    limit: 4,
    windowMs: 60 * 60 * 1000,
    failClosed: true,
  });
  if (!limited.allowed) {
    return {
      error: limited.degraded
        ? "Password recovery is temporarily unavailable. Please try again shortly."
        : "Too many reset requests. Please wait before trying again.",
    };
  }

  const token = await createPasswordReset(email);
  if (token) {
    const result = await sendDelivery({
      channel: "email",
      recipient: { email },
      subject: "Reset your Afyvia Pharmacy password",
      body: passwordResetBody(token),
    });
    if (result.status === "failed") console.error("[password reset delivery]", result.error);
  }

  return { success: "If that email exists, a reset link has been sent." };
}

export async function resetPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const csrfToken = String(formData.get("csrfToken") || "");
  try {
    await validateCsrfToken(csrfToken);
  } catch {
    return { error: "This form has expired. Refresh the page and try again." };
  }

  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!token || !password) return { error: "The reset link and a new password are required." };
  if (password !== confirm) return { error: "Passwords do not match." };
  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  const meta = await getRequestMeta();
  const limited = await checkRateLimitAsync(`reset:${meta.ip}`, {
    limit: 8,
    windowMs: 60 * 60 * 1000,
    failClosed: true,
  });
  if (!limited.allowed) {
    return {
      error: limited.degraded
        ? "Password reset is temporarily unavailable. Please try again shortly."
        : "Too many reset attempts. Please wait before trying again.",
    };
  }

  const ok = await resetPasswordWithToken(token, password);
  if (!ok) return { error: "This reset link is invalid or has expired. Request a new one." };

  return { success: "Password updated. You can sign in now." };
}
