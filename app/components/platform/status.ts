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
      return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/40 dark:bg-sky-400/15 dark:text-sky-100";
    case "under_review":
      return "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-400/40 dark:bg-violet-400/15 dark:text-violet-100";
    case "needs_info":
      return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/50 dark:bg-amber-400/15 dark:text-amber-100";
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-400/15 dark:text-emerald-100";
    case "active":
      return "border-emerald-200 bg-emerald-100/70 text-emerald-900 dark:border-emerald-300/50 dark:bg-emerald-300/20 dark:text-emerald-50";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/50 dark:bg-rose-400/15 dark:text-rose-100";
    case "suspended":
      return "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-500/50 dark:bg-rose-500/20 dark:text-rose-50";
    case "draft":
      return "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/20 dark:bg-white/5 dark:text-teal-50/70";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/20 dark:bg-white/5 dark:text-teal-50/80";
  }
}

export function priorityBadgeClass(priority: Priority): string {
  switch (priority) {
    case "critical":
      return "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-400/60 dark:bg-rose-500/25 dark:text-rose-50";
    case "high":
      return "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-400/50 dark:bg-amber-400/20 dark:text-amber-50";
    case "normal":
      return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-100";
    case "low":
    default:
      return "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-teal-50/70";
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
