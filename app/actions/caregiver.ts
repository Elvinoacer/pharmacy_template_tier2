"use server";

import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/db";
import {
  AuthError,
  createSession,
  getSessionUser,
  hashPassword,
  verifyPassword,
  writeAuditLog,
} from "@/app/lib/auth";
import { validatePassword } from "@/app/lib/password";
import { getRequestMeta } from "@/app/lib/request-meta";

export type CaregiverActionState = { error?: string; success?: string };

/**
 * Accept a caregiver invitation: create a caregiver account or link the
 * relationship to an existing account without changing that account's role.
 */
export async function acceptCaregiverInviteAction(
  _prev: CaregiverActionState,
  formData: FormData,
): Promise<CaregiverActionState> {
  const token = String(formData.get("token") || "").trim();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();

  if (!token) return { error: "Missing invitation token." };

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invite = await prisma.caregiverInvite.findUnique({
    where: { tokenHash },
    include: {
      caregiver: {
        include: { customer: { select: { id: true, fullName: true } } },
      },
    },
  });

  if (!invite) return { error: "Invalid invitation link." };
  if (invite.acceptedAt) return { error: "This invitation has already been used." };
  if (invite.expiresAt < new Date()) {
    return { error: "This invitation has expired. Ask the patient to resend." };
  }

  const email = invite.email.toLowerCase().trim();
  const name = fullName || invite.caregiver.caregiverName;
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  // A caregiver invitation proves possession of the invitation, not ownership
  // of an existing application account. Never turn it into a privileged login
  // token. Existing users must already be signed in as that account or verify
  // its password. OAuth-only users must sign in with their provider first.
  if (existingUser) {
    const currentSession = await getSessionUser().catch(() => null);
    const alreadyAuthenticated = currentSession?.id === existingUser.id;
    let passwordVerified = false;

    if (!alreadyAuthenticated && existingUser.passwordHash && password) {
      passwordVerified = await verifyPassword(password, existingUser.passwordHash);
    }

    if (!alreadyAuthenticated && !passwordVerified) {
      return {
        error: existingUser.passwordHash
          ? "This email already has an account. Enter that account's current password to accept the caregiver invitation."
          : "This email already has an account. Sign in with its existing sign-in method, then open the caregiver invitation again.",
      };
    }
  } else {
    const passwordError = validatePassword(password);
    if (passwordError) return { error: passwordError };
  }

  try {
    const userId = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email } });

      if (user) {
        // Preserve the account's existing global role and credentials. The
        // caregiver relationship itself grants caregiver access, allowing one
        // account to remain a customer/staff member and a caregiver.
        user = await tx.user.update({
          where: { id: user.id },
          data: { emailVerified: true },
        });
      } else {
        const passwordHash = await hashPassword(password);
        user = await tx.user.create({
          data: {
            email,
            passwordHash,
            role: "caregiver",
            emailVerified: true,
          },
        });
      }

      // Caregivers don't need a full CustomerProfile, but some portal helpers
      // expect a profile for display — create a lightweight one if missing.
      const existingProfile = await tx.customerProfile.findUnique({
        where: { userId: user.id },
      });
      if (!existingProfile) {
        const profile = await tx.customerProfile.create({
          data: {
            userId: user.id,
            fullName: name,
            phone: phone || invite.caregiver.caregiverPhone || null,
            onboardingCompletedAt: new Date(),
          },
        });
        await tx.customerPreference.create({
          data: { customerId: profile.id },
        });
      }

      await tx.caregiver.update({
        where: { id: invite.caregiverId },
        data: {
          caregiverUserId: user.id,
          caregiverName: name,
          caregiverPhone: phone || invite.caregiver.caregiverPhone,
          status: "active",
        },
      });

      await tx.caregiverInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });

      return user.id;
    });

    const meta = await getRequestMeta();
    await createSession(userId, { ip: meta.ip, userAgent: meta.userAgent });
    await writeAuditLog(userId, "caregiver_invite_accepted", "caregiver", invite.caregiverId, {
      patientId: invite.caregiver.customer.id,
      linkedExistingAccount: Boolean(existingUser),
    });

    revalidatePath("/caregiver");
    revalidatePath("/portal/caregivers");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    console.error("[acceptCaregiverInviteAction]", e);
    return { error: "Could not complete account setup. Please try again." };
  }

  redirect("/caregiver");
}

/** Unused helper kept for potential re-invite token generation. */
export async function generateCaregiverToken(): Promise<string> {
  return randomBytes(32).toString("hex");
}
