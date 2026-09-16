export const PHARMACY_TRANSACTION_FEE_PERCENT = 1;

/**
 * Feature flag for 1% pharmacy transaction commission.
 * Disabled by default. Enabled only when PHARMACY_TRANSACTION_COMMISSION_ENABLED === "true".
 */
export function isPharmacyCommissionEnabled(): boolean {
  return process.env.PHARMACY_TRANSACTION_COMMISSION_ENABLED === "true";
}

export function transactionFeeCents(grossKes: number): number {
  if (!Number.isFinite(grossKes) || grossKes < 0) throw new Error("Invalid transaction amount");
  return Math.round(Math.round(grossKes * 100) / 100);
}
export function billableFeeKes(balanceCents: number): number { return Math.max(0, Math.floor(balanceCents / 100)); }
