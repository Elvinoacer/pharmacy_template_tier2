import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { decryptSecret, encryptSecret, hashApiKey } from "@/app/lib/platform/secrets";
import type { DarajaEnv } from "@/app/lib/services/daraja";

import { getPlatformConfig } from "@/app/lib/platform-settings";

export type DarajaCredentials = {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  env: DarajaEnv;
  callbackUrl: string;
  source: "tenant" | "platform";
};

export type SenderIdentity = {
  pharmacyId: string | null;
  name: string;
  emailFrom: string | null;
  supportEmail: string;
  supportPhone: string;
  logoUrl: string | null;
  tagline: string | null;
  resendApiKey: string | null;
  twilioSid: string | null;
  twilioToken: string | null;
  twilioFrom: string | null;
  whatsappToken: string | null;
  whatsappPhoneNumberId: string | null;
  source: "tenant" | "platform";
};

function platformDaraja(): DarajaCredentials | null {
  const consumerKey = process.env.DARAJA_CONSUMER_KEY?.trim();
  const consumerSecret = process.env.DARAJA_CONSUMER_SECRET?.trim();
  const shortcode = process.env.DARAJA_SHORTCODE?.trim();
  const passkey = process.env.DARAJA_PASSKEY?.trim();
  const callbackUrl = process.env.DARAJA_CALLBACK_URL?.trim() || "";
  if (!consumerKey || !consumerSecret || !shortcode || !passkey) return null;
  return {
    consumerKey,
    consumerSecret,
    shortcode,
    passkey,
    env: process.env.DARAJA_ENV?.trim() === "production" ? "production" : "sandbox",
    callbackUrl,
    source: "platform",
  };
}

export async function resolveDarajaCredentials(pharmacyId: string | null): Promise<DarajaCredentials | null> {
  if (pharmacyId) {
    // Check IntegrationAccount first (canonical source)
    const account = await prismaUnscoped.integrationAccount.findUnique({
      where: { pharmacyId_kind_provider: { pharmacyId, kind: "daraja", provider: "daraja" } },
    }).catch(() => null);

    if (account?.secretsEnc) {
      try {
        const decrypted = JSON.parse(decryptSecret(account.secretsEnc) || "{}");
        const cfg = (account.config ?? {}) as { shortcode?: string; env?: string };
        if (decrypted.consumerKey && decrypted.consumerSecret && decrypted.passkey && cfg.shortcode) {
          return {
            consumerKey: decrypted.consumerKey,
            consumerSecret: decrypted.consumerSecret,
            shortcode: cfg.shortcode,
            passkey: decrypted.passkey,
            env: cfg.env === "production" ? "production" : "sandbox",
            callbackUrl: process.env.DARAJA_CALLBACK_URL?.trim() || "",
            source: "tenant",
          };
        }
      } catch {
        // Fall back to legacy PharmacyIntegration
      }
    }

    const row = await prismaUnscoped.pharmacyIntegration.findUnique({ where: { pharmacyId } });
    const key = decryptSecret(row?.darajaConsumerKeyEnc);
    const secret = decryptSecret(row?.darajaConsumerSecretEnc);
    const passkey = decryptSecret(row?.darajaPasskeyEnc);
    if (key && secret && passkey && row?.darajaShortcode) {
      return {
        consumerKey: key,
        consumerSecret: secret,
        shortcode: row.darajaShortcode,
        passkey,
        env: row.darajaEnv === "production" ? "production" : "sandbox",
        callbackUrl: process.env.DARAJA_CALLBACK_URL?.trim() || "",
        source: "tenant",
      };
    }
  }
  return platformDaraja();
}

export async function resolveSenderIdentity(pharmacyId: string | null): Promise<SenderIdentity> {
  const platform = getPlatformConfig();
  const base: SenderIdentity = {
    pharmacyId,
    name: platform.brandName,
    emailFrom: platform.emailFrom,
    supportEmail: platform.supportEmail,
    supportPhone: platform.supportPhone,
    logoUrl: null,
    tagline: null,
    resendApiKey: process.env.RESEND_API_KEY?.trim() || null,
    twilioSid: process.env.TWILIO_ACCOUNT_SID?.trim() || null,
    twilioToken: process.env.TWILIO_AUTH_TOKEN?.trim() || null,
    twilioFrom: process.env.TWILIO_SMS_FROM?.trim() || null,
    whatsappToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || null,
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || null,
    source: "platform",
  };

  if (!pharmacyId) return base;

  const [pharmacy, settings, integration] = await Promise.all([
    prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } }),
    prismaUnscoped.pharmacySettings.findUnique({ where: { pharmacyId } }).catch(() => null),
    prismaUnscoped.pharmacyIntegration.findUnique({ where: { pharmacyId } }).catch(() => null),
  ]);

  if (!pharmacy) return base;

  const twilioSid = decryptSecret(integration?.twilioAccountSidEnc) || base.twilioSid;
  const twilioToken = decryptSecret(integration?.twilioAuthTokenEnc) || base.twilioToken;
  const whatsappToken = decryptSecret(integration?.whatsappAccessTokenEnc) || base.whatsappToken;

  return {
    pharmacyId,
    name: settings?.displayName || pharmacy.name,
    emailFrom: integration?.emailFromOverride || base.emailFrom,
    supportEmail: integration?.supportEmailOverride || settings?.email || pharmacy.email || base.supportEmail,
    supportPhone: integration?.supportPhoneOverride || settings?.phone || pharmacy.phone || base.supportPhone,
    logoUrl: settings?.logoUrl || pharmacy.logoUrl,
    tagline: settings?.tagline || pharmacy.tagline,
    resendApiKey: base.resendApiKey,
    twilioSid,
    twilioToken,
    twilioFrom: integration?.twilioSmsFrom || base.twilioFrom,
    whatsappToken,
    whatsappPhoneNumberId: integration?.whatsappPhoneNumberId || base.whatsappPhoneNumberId,
    source: integration?.emailFromOverride || integration?.twilioAccountSidEnc || integration?.whatsappAccessTokenEnc
      ? "tenant"
      : "platform",
  };
}

export async function saveTenantDaraja(
  pharmacyId: string,
  input: { consumerKey: string; consumerSecret: string; passkey: string; shortcode: string; env?: string },
) {
  const env = input.env === "production" ? "production" : "sandbox";
  const secretsPayload = JSON.stringify({
    consumerKey: input.consumerKey,
    consumerSecret: input.consumerSecret,
    passkey: input.passkey,
  });

  // Upsert canonical IntegrationAccount
  await prismaUnscoped.integrationAccount.upsert({
    where: { pharmacyId_kind_provider: { pharmacyId, kind: "daraja", provider: "daraja" } },
    update: {
      status: "connected",
      config: { shortcode: input.shortcode, env },
      secretsEnc: encryptSecret(secretsPayload),
      rotatedAt: new Date(),
      secretsVersion: { increment: 1 },
    },
    create: {
      pharmacyId,
      kind: "daraja",
      provider: "daraja",
      status: "connected",
      config: { shortcode: input.shortcode, env },
      secretsEnc: encryptSecret(secretsPayload),
      rotatedAt: new Date(),
    },
  }).catch(() => {});

  // Legacy sync
  await prismaUnscoped.pharmacyIntegration.upsert({
    where: { pharmacyId },
    update: {
      darajaConsumerKeyEnc: encryptSecret(input.consumerKey),
      darajaConsumerSecretEnc: encryptSecret(input.consumerSecret),
      darajaPasskeyEnc: encryptSecret(input.passkey),
      darajaShortcode: input.shortcode,
      darajaEnv: env,
      secretsRotatedAt: new Date(),
      secretsVersion: { increment: 1 },
    },
    create: {
      pharmacyId,
      darajaConsumerKeyEnc: encryptSecret(input.consumerKey),
      darajaConsumerSecretEnc: encryptSecret(input.consumerSecret),
      darajaPasskeyEnc: encryptSecret(input.passkey),
      darajaShortcode: input.shortcode,
      darajaEnv: env,
      secretsRotatedAt: new Date(),
    },
  });
}

export async function authenticateApiKey(raw: string | null, requiredScopes?: string[]) {
  if (!raw) return null;
  const token = raw.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const hash = hashApiKey(token);
  const key = await prismaUnscoped.apiKey.findUnique({ where: { hash } });
  if (!key || key.revokedAt) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;

  if (requiredScopes && requiredScopes.length > 0) {
    const hasWildcard = key.scopes.includes("*") || key.scopes.includes("admin");
    if (!hasWildcard) {
      const hasAny = requiredScopes.some((s) => key.scopes.includes(s));
      if (!hasAny) return null;
    }
  }

  await prismaUnscoped.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});
  return key;
}

export async function requireApiKey(raw: string | null, requiredScopes?: string[]) {
  const key = await authenticateApiKey(raw, requiredScopes);
  if (!key) {
    throw new Error("API_KEY_UNAUTHORIZED: Missing, expired, revoked, or insufficient scope for API key");
  }
  return key;
}

export async function authenticatePos(raw: string | null) {
  const apiKey = await authenticateApiKey(raw, ["inventory.write", "pos.sync", "inventory.sync", "pos"]);
  if (apiKey) {
    return { pharmacyId: apiKey.pharmacyId, via: "api_key" as const, key: apiKey };
  }

  const token = raw?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const hash = hashApiKey(token);
  const integration = await prismaUnscoped.pharmacyIntegration.findFirst({
    where: { posApiKeyHash: hash },
  });
  if (integration) return { pharmacyId: integration.pharmacyId, via: "pos_hash" as const };
  return null;
}

export async function recordIntegrationHealth(
  pharmacyId: string,
  kind: "daraja" | "comms" | "pos",
  ok: boolean,
  error?: string | null,
) {
  const data =
    kind === "daraja"
      ? { darajaLastSuccessAt: ok ? new Date() : undefined, darajaLastError: ok ? null : error ?? "error" }
      : kind === "pos"
        ? { posLastSyncAt: ok ? new Date() : undefined, posLastError: ok ? null : error ?? "error" }
        : { commsLastSuccessAt: ok ? new Date() : undefined, commsLastError: ok ? null : error ?? "error" };
  await prismaUnscoped.pharmacyIntegration.updateMany({ where: { pharmacyId }, data });
}
