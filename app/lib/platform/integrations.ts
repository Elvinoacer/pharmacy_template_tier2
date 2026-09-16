import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { decryptSecret, encryptSecret, hashApiKey } from "@/app/lib/platform/secrets";
import type { DarajaEnv } from "@/app/lib/services/daraja";

import { getPlatformConfig } from "@/app/lib/platform-settings";

export type DarajaShortcodeType = "paybill" | "till";
export type DarajaTransactionType = "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";

export type DarajaCredentials = {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  env: DarajaEnv;
  callbackUrl: string;
  source: "tenant" | "platform";
  shortcodeType: DarajaShortcodeType;
  transactionType: DarajaTransactionType;
  pharmacyId?: string;
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

const DARAJA_SANDBOX_SHORTCODE = "174379";
const DARAJA_SANDBOX_PASSKEY =
  "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

export function getTenantDarajaCallbackUrl(): string {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredAppUrl) {
    try {
      const url = new URL("/api/payments/daraja/callback", configuredAppUrl);
      if (url.protocol === "https:" || process.env.NODE_ENV !== "production") return url.toString();
    } catch {
      /* fall through */
    }
  }

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (vercelHost) {
    return `https://${vercelHost.replace(/^https?:\/\//, "")}/api/payments/daraja/callback`;
  }

  return process.env.DARAJA_CALLBACK_URL?.trim() || "https://aether.co.ke/api/payments/daraja/callback";
}

function platformDaraja(): DarajaCredentials | null {
  const consumerKey = process.env.DARAJA_CONSUMER_KEY?.trim();
  const consumerSecret = process.env.DARAJA_CONSUMER_SECRET?.trim();
  const env: DarajaEnv = process.env.DARAJA_ENV?.trim().toLowerCase() === "production" ||
    process.env.DARAJA_ENV?.trim().toLowerCase() === "live"
    ? "production"
    : "sandbox";
  const configuredShortcode = process.env.DARAJA_SHORTCODE?.trim();
  const configuredPasskey = process.env.DARAJA_PASSKEY?.trim();
  const callbackUrl = process.env.DARAJA_CALLBACK_URL?.trim() || getTenantDarajaCallbackUrl();

  if (!consumerKey || !consumerSecret) return null;

  const shortcode = env === "sandbox" ? DARAJA_SANDBOX_SHORTCODE : configuredShortcode;
  const passkey = env === "sandbox" ? DARAJA_SANDBOX_PASSKEY : configuredPasskey;
  if (!shortcode || !passkey) return null;

  const configuredTransactionType: DarajaTransactionType =
    process.env.DARAJA_TRANSACTION_TYPE?.trim() === "CustomerBuyGoodsOnline"
      ? "CustomerBuyGoodsOnline"
      : "CustomerPayBillOnline";

  return {
    consumerKey,
    consumerSecret,
    shortcode,
    passkey,
    env,
    callbackUrl,
    source: "platform",
    shortcodeType: configuredTransactionType === "CustomerBuyGoodsOnline" ? "till" : "paybill",
    transactionType: configuredTransactionType,
  };
}

/**
 * Resolve tenant-specific Daraja credentials for customer commerce.
 * STRICT INVARIANT: FAILS CLOSED. NEVER FALLS BACK TO PLATFORM CREDENTIALS.
 * If the pharmacy has not configured complete credentials, returns null.
 */
export async function resolveTenantDarajaCredentials(
  pharmacyId: string,
): Promise<DarajaCredentials | null> {
  if (!pharmacyId) return null;

  const callbackUrl = getTenantDarajaCallbackUrl();

  // 1. Check IntegrationAccount first (canonical source)
  const account = await prismaUnscoped.integrationAccount.findUnique({
    where: { pharmacyId_kind_provider: { pharmacyId, kind: "daraja", provider: "daraja" } },
  }).catch(() => null);

  if (account?.secretsEnc) {
    try {
      const decrypted = JSON.parse(decryptSecret(account.secretsEnc) || "{}");
      const cfg = (account.config ?? {}) as {
        shortcode?: string;
        shortcodeType?: DarajaShortcodeType;
        env?: string;
        transactionType?: DarajaTransactionType;
      };

      const shortcode = String(cfg.shortcode || "").trim();
      const consumerKey = String(decrypted.consumerKey || "").trim();
      const consumerSecret = String(decrypted.consumerSecret || "").trim();
      const passkey = String(decrypted.passkey || "").trim();

      if (consumerKey && consumerSecret && passkey && shortcode) {
        const env: DarajaEnv = cfg.env === "production" ? "production" : "sandbox";
        const shortcodeType: DarajaShortcodeType =
          cfg.shortcodeType === "till" || cfg.transactionType === "CustomerBuyGoodsOnline"
            ? "till"
            : "paybill";
        const transactionType: DarajaTransactionType =
          shortcodeType === "till" ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline";

        return {
          consumerKey,
          consumerSecret,
          shortcode,
          passkey,
          env,
          callbackUrl,
          source: "tenant",
          shortcodeType,
          transactionType,
          pharmacyId,
        };
      }
    } catch {
      // Fall through to legacy PharmacyIntegration
    }
  }

  // 2. Fall back to legacy PharmacyIntegration
  const row = await prismaUnscoped.pharmacyIntegration.findUnique({ where: { pharmacyId } });
  const key = decryptSecret(row?.darajaConsumerKeyEnc)?.trim();
  const secret = decryptSecret(row?.darajaConsumerSecretEnc)?.trim();
  const passkey = decryptSecret(row?.darajaPasskeyEnc)?.trim();
  const shortcode = row?.darajaShortcode?.trim();

  if (key && secret && passkey && shortcode) {
    const env: DarajaEnv = row?.darajaEnv === "production" ? "production" : "sandbox";
    return {
      consumerKey: key,
      consumerSecret: secret,
      shortcode,
      passkey,
      env,
      callbackUrl,
      source: "tenant",
      shortcodeType: "paybill",
      transactionType: "CustomerPayBillOnline",
      pharmacyId,
    };
  }

  // Fail closed. Never return platform credentials for a tenant sale.
  return null;
}

/**
 * Resolve Daraja credentials.
 * If pharmacyId is supplied: resolves ONLY that pharmacy's credentials (fails closed).
 * If pharmacyId is null: resolves platform Daraja credentials for internal Aether platform use.
 */
export async function resolveDarajaCredentials(
  pharmacyId: string | null,
): Promise<DarajaCredentials | null> {
  if (pharmacyId) {
    return resolveTenantDarajaCredentials(pharmacyId);
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

export type PharmacyPaymentCapability = {
  onlinePaymentsEnabled: boolean;
  provider: "daraja" | null;
  reason:
    | "ready"
    | "not_configured"
    | "credentials_incomplete"
    | "credentials_invalid"
    | "sandbox_only"
    | "integration_error";
};

export type PharmacyPaymentSettingsView = {
  connected: boolean;
  environment: "sandbox" | "production";
  shortcodeType: "paybill" | "till";
  shortcode: string;
  maskedShortcode: string;
  credentialsConfigured: boolean;
  hasConsumerKey: boolean;
  hasConsumerSecret: boolean;
  hasPasskey: boolean;
  lastVerifiedAt: string | null;
  lastSuccessfulPaymentAt: string | null;
  status: "not_configured" | "credentials_saved" | "auth_verified" | "live_confirmed" | "error";
  lastError: string | null;
  callbackUrl: string;
};

export function maskShortcode(sc: string): string {
  const clean = sc.replace(/\D/g, "");
  if (!clean) return "";
  if (clean.length <= 4) return clean;
  return `****${clean.slice(-4)}`;
}

/**
 * Authoritative payment capability check for customer checkout.
 * Used by all customer checkout routes, order forms, and buttons.
 */
export async function getPharmacyPaymentCapability(
  pharmacyId: string | null | undefined,
): Promise<PharmacyPaymentCapability> {
  if (!pharmacyId) {
    return { onlinePaymentsEnabled: false, provider: null, reason: "not_configured" };
  }

  const [account, legacyRow] = await Promise.all([
    prismaUnscoped.integrationAccount.findUnique({
      where: { pharmacyId_kind_provider: { pharmacyId, kind: "daraja", provider: "daraja" } },
      select: { status: true, config: true, secretsEnc: true, lastError: true },
    }).catch(() => null),
    prismaUnscoped.pharmacyIntegration.findUnique({
      where: { pharmacyId },
      select: {
        darajaShortcode: true,
        darajaConsumerKeyEnc: true,
        darajaConsumerSecretEnc: true,
        darajaPasskeyEnc: true,
        darajaLastError: true,
        darajaEnv: true,
      },
    }).catch(() => null),
  ]);

  const hasAnyAccountConfig = Boolean(
    account?.secretsEnc ||
    (account?.config && typeof account.config === "object" && Object.keys(account.config).length > 0)
  );
  const hasAnyLegacyConfig = Boolean(
    legacyRow?.darajaShortcode ||
    legacyRow?.darajaConsumerKeyEnc ||
    legacyRow?.darajaConsumerSecretEnc ||
    legacyRow?.darajaPasskeyEnc
  );

  if (!hasAnyAccountConfig && !hasAnyLegacyConfig) {
    return { onlinePaymentsEnabled: false, provider: null, reason: "not_configured" };
  }

  const creds = await resolveTenantDarajaCredentials(pharmacyId);
  if (!creds) {
    if (account?.status === "error" || legacyRow?.darajaLastError) {
      return { onlinePaymentsEnabled: false, provider: null, reason: "integration_error" };
    }
    if (account?.secretsEnc || legacyRow?.darajaConsumerKeyEnc) {
      const dec = account?.secretsEnc
        ? decryptSecret(account.secretsEnc)
        : decryptSecret(legacyRow?.darajaConsumerKeyEnc);
      if (!dec) {
        return { onlinePaymentsEnabled: false, provider: null, reason: "credentials_invalid" };
      }
    }
    return { onlinePaymentsEnabled: false, provider: null, reason: "credentials_incomplete" };
  }

  if (account?.status === "error") {
    return { onlinePaymentsEnabled: false, provider: "daraja", reason: "integration_error" };
  }

  return {
    onlinePaymentsEnabled: true,
    provider: "daraja",
    reason: "ready",
  };
}

/**
 * Safe integration settings view for frontend / admin components.
 * NEVER returns raw or decrypted Consumer Secret, Passkey, or ciphertext!
 */
export async function getPharmacyPaymentSettings(
  pharmacyId: string,
): Promise<PharmacyPaymentSettingsView> {
  const callbackUrl = getTenantDarajaCallbackUrl();

  const [account, legacyRow] = await Promise.all([
    prismaUnscoped.integrationAccount.findUnique({
      where: { pharmacyId_kind_provider: { pharmacyId, kind: "daraja", provider: "daraja" } },
      select: {
        status: true,
        config: true,
        secretsEnc: true,
        lastSuccessAt: true,
        lastError: true,
      },
    }).catch(() => null),
    prismaUnscoped.pharmacyIntegration.findUnique({
      where: { pharmacyId },
      select: {
        darajaShortcode: true,
        darajaConsumerKeyEnc: true,
        darajaConsumerSecretEnc: true,
        darajaPasskeyEnc: true,
        darajaLastSuccessAt: true,
        darajaLastError: true,
        darajaEnv: true,
      },
    }).catch(() => null),
  ]);

  const cfg = (account?.config && typeof account.config === "object")
    ? (account.config as Record<string, unknown>)
    : {};

  let shortcode = String(cfg.shortcode || legacyRow?.darajaShortcode || "").trim();
  const environment: "sandbox" | "production" =
    cfg.env === "production" || legacyRow?.darajaEnv === "production" ? "production" : "sandbox";
  const shortcodeType: "paybill" | "till" =
    cfg.shortcodeType === "till" || cfg.transactionType === "CustomerBuyGoodsOnline"
      ? "till"
      : "paybill";

  let hasConsumerKey = false;
  let hasConsumerSecret = false;
  let hasPasskey = false;

  if (account?.secretsEnc) {
    try {
      const dec = JSON.parse(decryptSecret(account.secretsEnc) || "{}");
      hasConsumerKey = Boolean(dec.consumerKey);
      hasConsumerSecret = Boolean(dec.consumerSecret);
      hasPasskey = Boolean(dec.passkey);
    } catch {
      /* non-fatal */
    }
  }

  if (!hasConsumerKey && legacyRow?.darajaConsumerKeyEnc) {
    hasConsumerKey = Boolean(decryptSecret(legacyRow.darajaConsumerKeyEnc));
  }
  if (!hasConsumerSecret && legacyRow?.darajaConsumerSecretEnc) {
    hasConsumerSecret = Boolean(decryptSecret(legacyRow.darajaConsumerSecretEnc));
  }
  if (!hasPasskey && legacyRow?.darajaPasskeyEnc) {
    hasPasskey = Boolean(decryptSecret(legacyRow.darajaPasskeyEnc));
  }

  const credentialsConfigured = Boolean(
    shortcode && hasConsumerKey && hasConsumerSecret && hasPasskey,
  );

  const lastVerifiedAt = typeof cfg.credentialsVerifiedAt === "string" ? cfg.credentialsVerifiedAt : null;
  const lastSuccessfulPaymentAt =
    account?.lastSuccessAt?.toISOString() || legacyRow?.darajaLastSuccessAt?.toISOString() || null;
  const lastError = account?.lastError || legacyRow?.darajaLastError || null;

  let status: PharmacyPaymentSettingsView["status"] = "not_configured";
  if (lastError && !credentialsConfigured) {
    status = "error";
  } else if (lastSuccessfulPaymentAt) {
    status = "live_confirmed";
  } else if (lastVerifiedAt && credentialsConfigured) {
    status = "auth_verified";
  } else if (credentialsConfigured) {
    status = "credentials_saved";
  } else if (lastError) {
    status = "error";
  }

  return {
    connected: credentialsConfigured,
    environment,
    shortcodeType,
    shortcode,
    maskedShortcode: maskShortcode(shortcode),
    credentialsConfigured,
    hasConsumerKey,
    hasConsumerSecret,
    hasPasskey,
    lastVerifiedAt,
    lastSuccessfulPaymentAt,
    status,
    lastError,
    callbackUrl,
  };
}

export async function saveTenantDaraja(
  pharmacyId: string,
  input: {
    consumerKey?: string;
    consumerSecret?: string;
    passkey?: string;
    shortcode: string;
    shortcodeType?: "paybill" | "till";
    env?: "sandbox" | "production" | string;
  },
) {
  const env: "sandbox" | "production" = input.env === "production" ? "production" : "sandbox";
  const shortcodeType: "paybill" | "till" = input.shortcodeType === "till" ? "till" : "paybill";
  const transactionType: DarajaTransactionType =
    shortcodeType === "till" ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline";

  // Check existing credentials to support keeping saved values when left blank
  const existing = await resolveTenantDarajaCredentials(pharmacyId).catch(() => null);

  const consumerKey = (input.consumerKey?.trim() || existing?.consumerKey || "").trim();
  const consumerSecret = (input.consumerSecret?.trim() || existing?.consumerSecret || "").trim();
  const passkey = (input.passkey?.trim() || existing?.passkey || "").trim();
  const shortcode = (input.shortcode?.trim() || existing?.shortcode || "").trim();

  if (!shortcode) {
    throw new Error("Shortcode is required.");
  }
  if (!consumerKey || !consumerSecret || !passkey) {
    throw new Error(
      "Consumer Key, Consumer Secret, and Passkey are all required to accept online payments.",
    );
  }

  const secretsPayload = JSON.stringify({
    consumerKey,
    consumerSecret,
    passkey,
  });

  const encryptedSecrets = encryptSecret(secretsPayload);

  // Preserve existing account config fields (such as credentialsVerifiedAt)
  const existingAccount = await prismaUnscoped.integrationAccount.findUnique({
    where: { pharmacyId_kind_provider: { pharmacyId, kind: "daraja", provider: "daraja" } },
    select: { config: true },
  }).catch(() => null);

  const prevConfig = (existingAccount?.config && typeof existingAccount.config === "object")
    ? (existingAccount.config as Record<string, unknown>)
    : {};

  const config = {
    ...prevConfig,
    shortcode,
    shortcodeType,
    env,
    transactionType,
    updatedAt: new Date().toISOString(),
  };

  // Upsert canonical IntegrationAccount
  await prismaUnscoped.integrationAccount.upsert({
    where: { pharmacyId_kind_provider: { pharmacyId, kind: "daraja", provider: "daraja" } },
    update: {
      status: "connected",
      config,
      secretsEnc: encryptedSecrets,
      rotatedAt: new Date(),
      lastError: null,
      secretsVersion: { increment: 1 },
    },
    create: {
      pharmacyId,
      kind: "daraja",
      provider: "daraja",
      status: "connected",
      config,
      secretsEnc: encryptedSecrets,
      rotatedAt: new Date(),
    },
  }).catch(() => {});

  // Legacy sync
  await prismaUnscoped.pharmacyIntegration.upsert({
    where: { pharmacyId },
    update: {
      darajaConsumerKeyEnc: encryptSecret(consumerKey),
      darajaConsumerSecretEnc: encryptSecret(consumerSecret),
      darajaPasskeyEnc: encryptSecret(passkey),
      darajaShortcode: shortcode,
      darajaEnv: env,
      darajaLastError: null,
      secretsRotatedAt: new Date(),
      secretsVersion: { increment: 1 },
    },
    create: {
      pharmacyId,
      darajaConsumerKeyEnc: encryptSecret(consumerKey),
      darajaConsumerSecretEnc: encryptSecret(consumerSecret),
      darajaPasskeyEnc: encryptSecret(passkey),
      darajaShortcode: shortcode,
      darajaEnv: env,
      secretsRotatedAt: new Date(),
    },
  });
}

/**
 * Server-side OAuth test to verify Consumer Key and Consumer Secret with Safaricom.
 * Distinguishes authentication validity from shortcode/passkey live transaction confirmation.
 */
export async function testTenantDarajaConnection(
  pharmacyId: string,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const creds = await resolveTenantDarajaCredentials(pharmacyId);
  if (!creds) {
    return {
      ok: false,
      error: "Credentials incomplete or missing. Please provide shortcode, Consumer Key, Consumer Secret, and Passkey.",
    };
  }

  try {
    const { getDarajaToken } = await import("@/app/lib/services/daraja");
    await getDarajaToken(creds);

    const account = await prismaUnscoped.integrationAccount.findUnique({
      where: { pharmacyId_kind_provider: { pharmacyId, kind: "daraja", provider: "daraja" } },
      select: { config: true },
    }).catch(() => null);

    const cfg = (account?.config && typeof account.config === "object")
      ? (account.config as Record<string, unknown>)
      : {};

    await prismaUnscoped.integrationAccount.updateMany({
      where: { pharmacyId, kind: "daraja", provider: "daraja" },
      data: {
        status: "connected",
        lastError: null,
        config: {
          ...cfg,
          credentialsVerifiedAt: new Date().toISOString(),
        },
      },
    });

    await prismaUnscoped.pharmacyIntegration.updateMany({
      where: { pharmacyId },
      data: { darajaLastError: null },
    });

    return {
      ok: true,
      message:
        "OAuth authentication verified successfully! Safaricom confirmed your Daraja application credentials work.",
    };
  } catch (err) {
    const rawError = err instanceof Error ? err.message : "Authentication failed";
    const sanitized =
      rawError.includes("401") || rawError.includes("invalid_client")
        ? "Safaricom rejected your Consumer Key or Consumer Secret. Please verify them in the Daraja portal."
        : `Could not authenticate with Safaricom Daraja: ${rawError.slice(0, 120)}`;

    await prismaUnscoped.integrationAccount.updateMany({
      where: { pharmacyId, kind: "daraja", provider: "daraja" },
      data: { lastError: sanitized },
    });

    await prismaUnscoped.pharmacyIntegration.updateMany({
      where: { pharmacyId },
      data: { darajaLastError: sanitized },
    });

    return { ok: false, error: sanitized };
  }
}

export async function disconnectTenantDaraja(pharmacyId: string) {
  await prismaUnscoped.integrationAccount.updateMany({
    where: { pharmacyId, kind: "daraja", provider: "daraja" },
    data: {
      status: "unconfigured",
      config: {},
      secretsEnc: null,
      lastError: null,
    },
  });

  await prismaUnscoped.pharmacyIntegration.updateMany({
    where: { pharmacyId },
    data: {
      darajaShortcode: null,
      darajaConsumerKeyEnc: null,
      darajaConsumerSecretEnc: null,
      darajaPasskeyEnc: null,
      darajaEnv: null,
      darajaLastError: null,
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
