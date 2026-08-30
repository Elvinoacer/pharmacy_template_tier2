/** Shared platform status presentation — priority colours for verification ops. */

export type PharmacyStatusKey =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_info"
  | "approved"
  | "active"
  | "rejected"
  | "suspended"
  | string;

export type Priority = "critical" | "high" | "normal" | "low";

export function daysSince(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

/** Higher urgency for submitted/under_review that have aged, needs_info, etc. */
export function verificationPriority(
  status: PharmacyStatusKey,
  submittedAt?: Date | string | null,
  createdAt?: Date | string | null,
): Priority {
  const age = daysSince(submittedAt ?? createdAt);
  if (status === "needs_info") return "high";
  if (status === "submitted" || status === "under_review") {
    if (age != null && age >= 5) return "critical";
    if (age != null && age >= 2) return "high";
    return "normal";
  }
  if (status === "rejected" || status === "suspended") return "high";
  if (status === "approved") return "normal";
  if (status === "active") return "low";
  return "low";
}

export function statusBadgeClass(status: PharmacyStatusKey): string {
  switch (status) {
    case "submitted":
      return "border-sky-400/40 bg-sky-400/15 text-sky-100";
    case "under_review":
      return "border-violet-400/40 bg-violet-400/15 text-violet-100";
    case "needs_info":
      return "border-amber-400/50 bg-amber-400/15 text-amber-100";
    case "approved":
      return "border-emerald-400/40 bg-emerald-400/15 text-emerald-100";
    case "active":
      return "border-emerald-300/50 bg-emerald-300/20 text-emerald-50";
    case "rejected":
      return "border-rose-400/50 bg-rose-400/15 text-rose-100";
    case "suspended":
      return "border-rose-500/50 bg-rose-500/20 text-rose-50";
    case "draft":
      return "border-white/20 bg-white/5 text-teal-50/70";
    default:
      return "border-white/20 bg-white/5 text-teal-50/80";
  }
}

export function priorityBadgeClass(priority: Priority): string {
  switch (priority) {
    case "critical":
      return "border-rose-400/60 bg-rose-500/25 text-rose-50";
    case "high":
      return "border-amber-400/50 bg-amber-400/20 text-amber-50";
    case "normal":
      return "border-sky-400/40 bg-sky-400/10 text-sky-100";
    case "low":
    default:
      return "border-white/15 bg-white/5 text-teal-50/70";
  }
}

export function priorityLabel(priority: Priority): string {
  switch (priority) {
    case "critical":
      return "Urgent";
    case "high":
      return "High";
    case "normal":
      return "Normal";
    case "low":
      return "Low";
  }
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}
