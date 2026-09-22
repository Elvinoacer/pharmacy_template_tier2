export const FREE_MEDICINE_LIMIT = 5;
export const FREE_SERVICE_LIMIT = 2;
export const FREE_MONTHLY_PRESCRIPTION_REFERRAL_LIMIT = 10;
export const FREE_MONTHLY_CAMPAIGN_LAUNCH_LIMIT = 1;

export const PREMIUM_GROWTH_FEATURES = [
  "campaign_scheduling",
  "multi_channel_campaigns",
  "custom_segments",
  "automated_followups",
  "loyalty_automation",
  "inventory_intelligence",
  "advanced_storefront",
  "custom_message_templates",
] as const;

export type PremiumGrowthFeature = (typeof PREMIUM_GROWTH_FEATURES)[number];

export const PREMIUM_FEATURES = new Set<string>([
  "analytics",
  "ai_import",
  "pos_sync",
  ...PREMIUM_GROWTH_FEATURES,
]);

function errorText(error: unknown): string {
  return error instanceof Error
    ? `${error.message} ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`
    : String(error);
}

export function listingLimitMessage(error: unknown): string | null {
  const text = errorText(error);
  if (text.includes("FREE_MEDICINE_LIMIT")) return "The free plan includes 5 public medicine listings. Unpublish a listing or upgrade to Premium for KES 500/month in Admin → Plans & billing.";
  if (text.includes("FREE_SERVICE_LIMIT")) return "The free plan includes 2 active services. Deactivate a service or upgrade to Premium for KES 500/month in Admin → Plans & billing.";
  return null;
}

export function growthLimitMessage(error: unknown): string | null {
  const text = errorText(error);
  if (text.includes("FREE_MONTHLY_CAMPAIGN_LAUNCH_LIMIT")) {
    return "Free includes 1 campaign launch per month. Keep drafting campaigns, or upgrade to Premium for unlimited launches, scheduling and richer targeting.";
  }
  if (text.includes("PREMIUM_REQUIRED:campaign_scheduling")) {
    return "Campaign scheduling is a Premium growth feature. Free pharmacies can save drafts or send their monthly campaign immediately.";
  }
  if (text.includes("PREMIUM_REQUIRED:multi_channel_campaigns")) {
    return "Multi-channel campaigns are available on Premium. On Free, choose a single channel such as email, SMS or WhatsApp.";
  }
  if (text.includes("PREMIUM_REQUIRED:custom_segments")) {
    return "Custom patient segments are a Premium growth feature. System patient groups remain available on Free.";
  }
  if (text.includes("PREMIUM_REQUIRED:automated_followups")) {
    return "Automatic follow-up workflows are available on Premium. Manual patient reminders remain available on Free.";
  }
  if (text.includes("PREMIUM_REQUIRED:loyalty_automation")) {
    return "Automated loyalty rewards and promotional campaigns are available on Premium. Existing member balances remain visible.";
  }
  if (text.includes("PREMIUM_REQUIRED:inventory_intelligence")) {
    return "Inventory intelligence is available on Premium. Stock levels, low-stock alerts, stock-outs, batches and expiry tracking remain available on Free.";
  }
  if (text.includes("PREMIUM_REQUIRED:advanced_storefront")) {
    return "Advanced storefront conversion controls are available on Premium. Your basic Afyvia storefront remains available on Free.";
  }
  if (text.includes("PREMIUM_REQUIRED:custom_message_templates")) {
    return "Creating custom reusable message templates is available on Premium. Existing templates remain readable on Free.";
  }
  return null;
}

export function planLimitMessage(error: unknown): string | null {
  return listingLimitMessage(error) || growthLimitMessage(error);
}
