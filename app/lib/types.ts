import type {
  UserRole as PrismaUserRole,
  RefillStatus as PrismaRefillStatus,
  PharmacyMemberRole as PrismaPharmacyMemberRole,
} from "@/app/generated/prisma/client";

export type UserRole = PrismaUserRole | "customer" | "caregiver" | "pharmacist" | "staff" | "manager";
export type RefillStatus = PrismaRefillStatus;
export type PharmacyMemberRole = PrismaPharmacyMemberRole | "owner" | "manager" | "pharmacist" | "staff";

export type StaffMembership = {
  id: string;
  pharmacyId: string;
  slug: string;
  name: string;
  role: PharmacyMemberRole;
  status: string;
};

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  fullName: string | null;
  customerId: string | null;
  platformAdmin: boolean;
  platformRole: string;
  twoFactorEnabled: boolean;
  mfaVerifiedAt?: Date | null;
  lastReauthAt: Date | null;
  memberships: StaffMembership[];
  activePharmacyId: string | null;
};

/**
 * Two audience surfaces:
 * - Customer portal: customer + caregiver (self-service)
 * - Staff CRM (/admin): pharmacist + staff + manager (never public self-serve signup)
 * - Platform console (/platform): platformAdmin flag, independent of pharmacy role
 */
export const CUSTOMER_ROLES: UserRole[] = ["customer", "caregiver"];
export const STAFF_ROLES: UserRole[] = ["pharmacist", "staff", "manager"];

export const REFILL_STATUSES: { value: RefillStatus; label: string; color: string }[] = [
  { value: "submitted", label: "Submitted", color: "border border-slate-500/70 bg-slate-100 text-slate-800 dark:border-slate-400/70 dark:bg-slate-900 dark:text-slate-100" },
  { value: "under_review", label: "Under Review", color: "border border-amber-700/70 bg-amber-100 text-amber-900 dark:border-amber-300/70 dark:bg-amber-950/50 dark:text-amber-100" },
  { value: "approved", label: "Approved", color: "border border-blue-700/70 bg-blue-100 text-blue-900 dark:border-blue-300/70 dark:bg-blue-950/50 dark:text-blue-100" },
  { value: "preparing", label: "Preparing", color: "border border-indigo-700/70 bg-indigo-100 text-indigo-900 dark:border-indigo-300/70 dark:bg-indigo-950/50 dark:text-indigo-100" },
  { value: "ready_for_pickup", label: "Ready for Pickup", color: "border border-teal-700/70 bg-teal-100 text-teal-900 dark:border-teal-300/70 dark:bg-teal-950/50 dark:text-teal-100" },
  { value: "collected", label: "Collected", color: "border border-emerald-700/70 bg-emerald-100 text-emerald-900 dark:border-emerald-300/70 dark:bg-emerald-950/50 dark:text-emerald-100" },
  { value: "cancelled", label: "Cancelled", color: "border border-rose-700/70 bg-rose-100 text-rose-900 dark:border-rose-300/70 dark:bg-rose-950/50 dark:text-rose-100" },
];

export function refillStatusMeta(status: string) {
  return (
    REFILL_STATUSES.find((s) => s.value === status) ?? {
      value: status as RefillStatus,
      label: status,
      color: "border border-slate-500/70 bg-slate-100 text-slate-800 dark:border-slate-400/70 dark:bg-slate-900 dark:text-slate-100",
    }
  );
}
