export const VERIFICATION_FEE_KES = 100;
export const MONTHLY_FEE_KES = 500;
export const BUNDLE_FEE_KES = 600; // KES 100 one-time verification + KES 500 first month platform service

export function clampFeeSubsidy(input: { verificationKes?: number; monthlyKes?: number }) {
  const verificationKes = Math.min(VERIFICATION_FEE_KES, Math.max(0, input.verificationKes ?? 0));
  const monthlyKes = Math.min(MONTHLY_FEE_KES, Math.max(0, input.monthlyKes ?? 0));
  return {
    verificationKes,
    monthlyKes,
    verificationBalanceKes: VERIFICATION_FEE_KES - verificationKes,
    monthlyBalanceKes: MONTHLY_FEE_KES - monthlyKes,
    bundleBalanceKes: BUNDLE_FEE_KES - verificationKes - monthlyKes,
  };
}
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
