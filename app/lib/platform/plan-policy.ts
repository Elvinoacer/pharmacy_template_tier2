export const FREE_MEDICINE_LIMIT = 5;
export const FREE_SERVICE_LIMIT = 2;
export const FREE_MONTHLY_PRESCRIPTION_REFERRAL_LIMIT = 10;
export const PREMIUM_FEATURES = new Set(["analytics", "ai_import", "pos_sync"]);

export function listingLimitMessage(error: unknown): string | null {
  const text = error instanceof Error ? `${error.message} ${JSON.stringify(error, Object.getOwnPropertyNames(error))}` : String(error);
  if (text.includes("FREE_MEDICINE_LIMIT")) return "The free plan includes 5 public medicine listings. Unpublish a listing or upgrade to Premium for KES 500/month in Admin → Plans & billing.";
  if (text.includes("FREE_SERVICE_LIMIT")) return "The free plan includes 2 active services. Deactivate a service or upgrade to Premium for KES 500/month in Admin → Plans & billing.";
  return null;
}
