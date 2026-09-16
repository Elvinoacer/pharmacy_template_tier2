export const VERIFICATION_FEE_KES = 100;
export const MONTHLY_FEE_KES = 500;
export const BUNDLE_FEE_KES = 600; // KES 100 one-time verification + KES 500 first month platform service
/** Calendar month, clamped to the last valid day (January 31 → February 28). */
export function nextBillingMonth(start: Date): Date {
  const end = new Date(start);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, last));
  return end;
}
