"use server";

import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/db";
import {
  AuthError,
  createSession,
  hashPassword,
  writeAuditLog,
} from "@/app/lib/auth";
import { getRequestMeta } from "@/app/lib/request-meta";

export type CaregiverActionState = { error?: string; success?: string };

/**
 * Accept a caregiver invitation: create (or link) a caregiver-role user,
 * mark the invite accepted, and link caregiverUserId on the Caregiver row.
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
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

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
  if (invite.expiresAt < new Date()) return { error: "This invitation has expired. Ask the patient to resend." };

  const email = invite.email.toLowerCase().trim();
  const name = fullName || invite.caregiver.caregiverName;

  try {
    const userId = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email } });

      if (user) {
        // Existing account — upgrade/ensure caregiver role and set password if missing.
        const passwordHash = await hashPassword(password);
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            role: "caregiver",
            passwordHash: user.passwordHash || passwordHash,
            emailVerified: true,
          },
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
        await tx.customerProfile.create({
          data: {
            userId: user.id,
            fullName: name,
            phone: phone || invite.caregiver.caregiverPhone || null,
            onboardingCompletedAt: new Date(),
          },
        });
        await tx.customerPreference.create({
          data: { customerId: (await tx.customerProfile.findUniqueOrThrow({ where: { userId: user.id } })).id },
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
