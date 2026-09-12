import "server-only";
import { prismaUnscoped } from "@/app/lib/db";
import {
  findPharmacyBySlug,
  isActiveListed,
  withPharmacy,
} from "@/app/lib/tenant";
import { getResolvedPharmacyOrNull } from "./pharmacy-settings";
export async function publicPharmacyProfile(slug: string) {
  const pharmacy = await findPharmacyBySlug(slug);
  if (!pharmacy || !isActiveListed(pharmacy)) return null;
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
          if (
            typeof row.src !== "string" ||
            !/^(https?:\/\/|\/(?!\/))/.test(row.src)
          )
            return [];
          return [
            {
              src: row.src,
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
  return {
    profile,
    gallery,
    hasPhone: Boolean(settings?.phone?.trim() || pharmacy.phone),
    hasEmail: Boolean(settings?.email?.trim() || pharmacy.email),
    hasWhatsapp: Boolean(
      settings?.whatsapp?.trim() ||
      pharmacy.whatsapp ||
      settings?.phone?.trim() ||
      pharmacy.phone,
    ),
  };
}
