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
import { publicErrorMessage } from "@/app/lib/public-error";
import { validatePassword } from "@/app/lib/password";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import { getRequestMeta } from "@/app/lib/request-meta";

export type CaregiverActionState = { error?: string; success?: string };

export async function acceptCaregiverInviteAction(
  _prev: CaregiverActionState,
  formData: FormData,
): Promise<CaregiverActionState> {
  const token = String(formData.get("token") || "").trim();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();

  if (!token) return { error: "This invitation link is incomplete. Ask the patient to send a new one." };

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invite = await prisma.caregiverInvite.findUnique({
    where: { tokenHash },
    include: {
      caregiver: {
        include: { customer: { select: { id: true, fullName: true } } },
      },
    },
  });

  if (!invite) return { error: "This invitation link is invalid. Ask the patient to send a new one." };
  if (invite.acceptedAt) return { error: "This invitation has already been used." };
  if (invite.expiresAt < new Date()) {
    return { error: "This invitation has expired. Ask the patient to send a new one." };
  }

  const rate = await checkRateLimitAsync(`caregiver-accept:${invite.id}`, {
    limit: 8,
    windowMs: 15 * 60 * 1000,
    failClosed: true,
  });
  if (!rate.allowed) {
    return { error: `Too many attempts. Try again in ${rate.retryAfterSeconds}s.` };
  }

  const email = invite.email.toLowerCase().trim();
  const name = fullName || invite.caregiver.caregiverName;
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

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
          ? "This email already has an account. Enter that account's current password to accept the invitation."
          : "This email already has an account. Sign in with the existing sign-in method, then open the invitation again.",
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
        await tx.customerPreference.create({ data: { customerId: profile.id } });
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
    if (e instanceof AuthError) {
      return { error: publicErrorMessage(e, "We couldn't complete caregiver access. Please try again.") };
    }
    console.error("[acceptCaregiverInviteAction]", e);
    return { error: "We couldn't complete caregiver setup right now. Please try again." };
  }

  redirect("/caregiver");
}

export async function generateCaregiverToken(): Promise<string> {
  return randomBytes(32).toString("hex");
}
