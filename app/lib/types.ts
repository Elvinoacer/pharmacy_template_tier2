import type {
  UserRole as PrismaUserRole,
  RefillStatus as PrismaRefillStatus,
} from "@/app/generated/prisma/client";

export type UserRole = PrismaUserRole | "customer" | "caregiver" | "pharmacist" | "staff" | "manager";
export type RefillStatus = PrismaRefillStatus;

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  fullName: string | null;
  customerId: string | null;
};

/**
 * Two audience surfaces:
 * - Customer portal: customer + caregiver (self-service)
 * - Staff CRM (/admin): pharmacist + staff + manager (never public self-serve signup)
 */
export const CUSTOMER_ROLES: UserRole[] = ["customer", "caregiver"];
export const STAFF_ROLES: UserRole[] = ["pharmacist", "staff", "manager"];

export const REFILL_STATUSES: { value: RefillStatus; label: string; color: string }[] = [
  { value: "submitted", label: "Submitted", color: "bg-slate-100 text-slate-700" },
  { value: "under_review", label: "Under Review", color: "bg-amber-100 text-amber-800" },
  { value: "approved", label: "Approved", color: "bg-blue-100 text-blue-800" },
  { value: "preparing", label: "Preparing", color: "bg-indigo-100 text-indigo-800" },
  { value: "ready_for_pickup", label: "Ready for Pickup", color: "bg-teal-100 text-teal-800" },
  { value: "collected", label: "Collected", color: "bg-emerald-100 text-emerald-800" },
  { value: "cancelled", label: "Cancelled", color: "bg-rose-100 text-rose-800" },
];

export function refillStatusMeta(status: string) {
  return (
    REFILL_STATUSES.find((s) => s.value === status) ?? {
      value: status as RefillStatus,
      label: status,
      color: "bg-slate-100 text-slate-700",
    }
  );
}
