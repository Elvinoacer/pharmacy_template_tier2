/** Pharmacy pays 1%; customers pay the published order total. Work in integer cents. */
export const PHARMACY_TRANSACTION_FEE_PERCENT = 1;
export function transactionFeeCents(grossKes: number): number {
  if (!Number.isFinite(grossKes) || grossKes < 0) throw new Error("Invalid transaction amount");
  return Math.round(Math.round(grossKes * 100) / 100);
}
export function billableFeeKes(balanceCents: number): number { return Math.max(0, Math.floor(balanceCents / 100)); }
