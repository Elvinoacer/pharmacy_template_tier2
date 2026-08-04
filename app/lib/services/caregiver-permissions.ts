import "server-only";

import { prisma } from "@/app/lib/db";
import type { SessionUser } from "@/app/lib/types";

/**
 * Caregiver permission helpers.
 *
 * Every caregiver action goes through one of these guards. They enforce the
 * three permission rules from the spec:
 *
 *   1. There must be an active caregiver relationship.
 *   2. The caregiver only sees data for the patients linked to them.
 *   3. Specific actions (request refills, receive pickup notifications, log
 *      adherence) must respect the flags the patient granted.
 *
 * Each helper returns the Caregiver row (with customer + permissions loaded)
 * on success, or null if the relationship or permission doesn't exist.
 */

export type CaregiverLink = Awaited<ReturnType<typeof getActiveCaregiverLink>>;

/**
 * Get the active caregiver link between a user and a patient, including
 * the customer profile + permissions. Returns null if no active link exists.
 */
export async function getActiveCaregiverLink(
  caregiverUserId: string,
  customerId: string,
) {
  return prisma.caregiver.findFirst({
    where: {
      caregiverUserId,
      customerId,
      status: "active",
    },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          user: { select: { email: true } },
        },
      },
    },
  });
}

/**
 * List all active caregiver links for a user, with patient summaries loaded.
 */
export async function getActiveCaregiverLinks(caregiverUserId: string) {
  return prisma.caregiver.findMany({
    where: { caregiverUserId, status: "active" },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          user: { select: { email: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Assert the user is a caregiver (or staff with caregiver link) for a specific patient.
 * Returns the link row on success; throws 403-style error if not authorized.
 */
export async function requireCaregiverForPatient(
  user: SessionUser,
  customerId: string,
): Promise<NonNullable<CaregiverLink>> {
  const link = await getActiveCaregiverLink(user.id, customerId);
  if (!link) {
    throw new Error(
      "You are not an active caregiver for this patient. Ask the patient to send you an invitation.",
    );
  }
  return link;
}

/**
 * Assert the caregiver can request refills for this patient.
 */
export async function requireCanRequestRefills(
  user: SessionUser,
  customerId: string,
): Promise<NonNullable<CaregiverLink>> {
  const link = await requireCaregiverForPatient(user, customerId);
  if (!link.canRequestRefills) {
    throw new Error(
      "The patient has not granted you permission to request refills on their behalf.",
    );
  }
  return link;
}

/**
 * Assert the caregiver can receive pickup notifications for this patient.
 */
export async function requireCanReceivePickupNotifications(
  user: SessionUser,
  customerId: string,
): Promise<NonNullable<CaregiverLink>> {
  const link = await requireCaregiverForPatient(user, customerId);
  if (!link.canReceivePickupNotifications) {
    throw new Error(
      "The patient has not granted you permission to receive pickup notifications.",
    );
  }
  return link;
}

/**
 * Assert the caregiver can log adherence for this patient.
 */
export async function requireCanLogAdherence(
  user: SessionUser,
  customerId: string,
): Promise<NonNullable<CaregiverLink>> {
  const link = await requireCaregiverForPatient(user, customerId);
  if (!link.canLogAdherence) {
    throw new Error(
      "The patient has not granted you permission to log medication adherence on their behalf.",
    );
  }
  return link;
}

/**
 * Returns true if the user is a caregiver (role=caregiver OR has any active
 * caregiver link). Used by the login router to decide whether to send the
 * user to /caregiver instead of /portal or /admin.
 */
export async function isCaregiver(user: SessionUser): Promise<boolean> {
  if (user.role === "caregiver") return true;
  const count = await prisma.caregiver.count({
    where: { caregiverUserId: user.id, status: "active" },
  });
  return count > 0;
}
