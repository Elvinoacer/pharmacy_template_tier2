import "server-only";
import { cache } from "react";
import { publicImageUrl } from "@/app/lib/public-storefront";
import { prismaUnscoped } from "@/app/lib/db";
import {
  findPharmacyBySlug,
  isActiveListed,
  withPharmacy,
} from "@/app/lib/tenant";
import { getResolvedPharmacyOrNull } from "./pharmacy-settings";
export const publicPharmacyProfile = cache(async (slug: string) => {
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/i.test(slug)) return null;
  const pharmacy = await findPharmacyBySlug(slug);
  if (!pharmacy || !isActiveListed(pharmacy)) return null;
  // Approval is recorded separately from active/listed. Re-check all three
  // before loading or exposing any tenant-owned profile data.
  const approved = await withPharmacy(pharmacy.id, () =>
    prismaUnscoped.pharmacy.findFirst({
      where: { id: pharmacy.id, status: "active", listed: true, verifiedAt: { not: null } },
      select: { id: true },
    }), pharmacy.slug);
  if (!approved) return null;
  const [profile, settings] = await Promise.all([
    getResolvedPharmacyOrNull({ pharmacyId: pharmacy.id }),
    withPharmacy(
      pharmacy.id,
      () =>
        prismaUnscoped.pharmacySettings.findUnique({
          where: { pharmacyId: pharmacy.id },
          select: {
            phone: true,
            email: true,
            whatsapp: true,
            storefront: true,
          },
        }),
      pharmacy.slug,
    ),
  ]);
  if (!profile) return null;
  const doc = settings?.storefront as { gallery?: unknown } | null;
  const gallery = Array.isArray(doc?.gallery)
    ? doc.gallery
        .flatMap((item: unknown) => {
          if (!item || typeof item !== "object") return [];
          const row = item as Record<string, unknown>;
          const src = publicImageUrl(row.src);
          if (!src) return [];
          return [
            {
              src,
              caption: typeof row.caption === "string" ? row.caption : "",
              alt:
                typeof row.alt === "string"
                  ? row.alt
                  : "Photo supplied by the pharmacy",
            },
          ];
        })
        .slice(0, 12)
    : [];
  const phone = settings?.phone?.trim() || pharmacy.phone?.trim() || "";
  const email = settings?.email?.trim() || pharmacy.email?.trim() || "";
  // A phone number is not evidence that the pharmacy uses WhatsApp.
  const whatsapp = settings?.whatsapp?.trim() || pharmacy.whatsapp?.trim() || "";
  return {
    profile: {
      ...profile,
      phone,
      phoneHref: phone ? `tel:${phone.replace(/[^+\d]/g, "")}` : "",
      email,
      whatsapp,
      whatsappHref: whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}` : "",
      logoUrl: publicImageUrl(profile.logoUrl),
      coverImageUrl: publicImageUrl(profile.coverImageUrl),
    },
    gallery,
    hasPhone: Boolean(phone),
    hasEmail: Boolean(email),
    hasWhatsapp: Boolean(whatsapp),
  };
});
