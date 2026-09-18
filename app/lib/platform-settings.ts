import "server-only";

export type PlatformConfig = {
  brandName: string;
  supportEmail: string;
  supportPhone: string;
  supportUrl: string;
  emailFrom: string;
  smsSender: string;
  currency: string;
};

export function getPlatformConfig(): PlatformConfig {
  const brandName = process.env.PLATFORM_BRAND_NAME?.trim() || "Afyvia Network";
  const supportEmail = process.env.SUPPORT_EMAIL?.trim() || process.env.EMAIL_FROM?.trim() || "support@gtss.software";
  const supportPhone = process.env.SUPPORT_PHONE?.trim() || "0790670542";
  const supportUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://afyvia.network";
  const emailFrom = process.env.EMAIL_FROM?.trim() || `noreply@${supportUrl.replace(/^https?:\/\//, "")}`;
  const smsSender = process.env.TWILIO_SMS_FROM?.trim() || "Afyvia";
  const currency = "KES";

  return {
    brandName,
    supportEmail,
    supportPhone,
    supportUrl,
    emailFrom,
    smsSender,
    currency,
  };
}
