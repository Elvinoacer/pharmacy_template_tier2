import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { recordLifecycle } from "@/app/lib/platform/lifecycle";
import { encryptSecret, generateApiKey } from "@/app/lib/platform/secrets";
import { loadLatestVerificationProfile } from "@/app/lib/services/pharmacy-verification";

export async function provisionTenant(pharmacyId: string, actorId?: string | null) {
  const [pharmacy, verification] = await Promise.all([
    prismaUnscoped.pharmacy.findUnique({
      where: { id: pharmacyId },
      include: { owner: { select: { email: true } } },
    }),
    loadLatestVerificationProfile(pharmacyId),
  ]);
  if (!pharmacy) throw new Error("pharmacy_not_found");

  const verifiedAddress = verification?.profile.physicalAddress || null;
  const contactEmail = pharmacy.email || pharmacy.owner?.email || null;
  const identity = {
    phone: pharmacy.phone,
    email: contactEmail,
    addressLine1: verifiedAddress,
    city: pharmacy.city,
    county: pharmacy.county,
    latitude: pharmacy.latitude,
    longitude: pharmacy.longitude,
  };

  let branch = await prismaUnscoped.pharmacyBranch.findFirst({
    where: { pharmacyId, isDefault: true },
  });
  if (!branch) {
    branch = await prismaUnscoped.pharmacyBranch.create({
      data: {
        pharmacyId,
        name: "Main Branch",
        code: "MAIN",
        isDefault: true,
        ...identity,
      },
    });
  } else {
    branch = await prismaUnscoped.pharmacyBranch.update({
      where: { id: branch.id },
      data: identity,
    });
  }

  await prismaUnscoped.pharmacy.update({
    where: { id: pharmacyId },
    data: { defaultBranchId: branch.id },
  });

  await prismaUnscoped.pharmacyIntegration.upsert({
    where: { pharmacyId },
    update: {},
    create: { pharmacyId },
  });

  await prismaUnscoped.pharmacySettings.upsert({
    where: { pharmacyId },
    update: {
      displayName: pharmacy.name,
      phone: pharmacy.phone,
      email: contactEmail,
      whatsapp: pharmacy.whatsapp,
      addressLine1: verifiedAddress,
      city: pharmacy.city,
      state: pharmacy.county,
      country: pharmacy.country,
      latitude: pharmacy.latitude,
      longitude: pharmacy.longitude,
    },
    create: {
      pharmacyId,
      displayName: pharmacy.name,
      phone: pharmacy.phone,
      email: contactEmail,
      whatsapp: pharmacy.whatsapp,
      addressLine1: verifiedAddress,
      city: pharmacy.city,
      state: pharmacy.county,
      country: pharmacy.country,
      latitude: pharmacy.latitude,
      longitude: pharmacy.longitude,
    },
  });

  const templates = [
    {
      key: "order_paid",
      channel: "email" as const,
      subject: "Payment received",
      body: "Thank you. Your order has been paid.",
    },
    {
      key: "order_ready",
      channel: "sms" as const,
      subject: null,
      body: "Your order is ready for pickup.",
    },
  ];
  for (const template of templates) {
    await prismaUnscoped.notificationTemplate.upsert({
      where: {
        pharmacyId_key_channel: {
          pharmacyId,
          key: template.key,
          channel: template.channel,
        },
      },
      update: {},
      create: { pharmacyId, ...template },
    });
  }

  await recordLifecycle(pharmacyId, "verified", {
    toStatus: "onboarding",
    actorId: actorId ?? undefined,
  });
  return { branchId: branch.id };
}

export async function issueTenantApiKey(
  pharmacyId: string,
  name: string,
  scopes: string[],
  createdById?: string | null,
) {
  const generated = generateApiKey("aeth");
  const row = await prismaUnscoped.apiKey.create({
    data: {
      pharmacyId,
      name,
      prefix: generated.prefix,
      hash: generated.hash,
      scopes,
      createdById: createdById ?? null,
    },
  });
  return { id: row.id, raw: generated.raw, prefix: generated.prefix };
}

export async function rotateWebhookSecret(endpointId: string, secret: string) {
  await prismaUnscoped.webhookEndpoint.update({
    where: { id: endpointId },
    data: { secretEnc: encryptSecret(secret) },
  });
}
