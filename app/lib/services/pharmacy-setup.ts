import "server-only";

import { prismaUnscoped as db } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant-context";
import { loadLatestVerificationProfile } from "@/app/lib/services/pharmacy-verification";

export type PharmacySetupCheckKey =
  | "verification"
  | "verification_fee"
  | "location"
  | "hours"
  | "medicines"
  | "services"
  | "about"
  | "photos"
  | "gallery"
  | "subscription";

export type PharmacySetupCheck = {
  key: PharmacySetupCheckKey;
  ok: boolean;
  required: boolean;
  label: string;
  hint: string;
  href: string;
};

export async function loadPharmacySetup(pharmacyId: string) {
  return withPharmacy(pharmacyId, async () => {
    const [p, medicines, services, invoice, subscription, verificationProfile] = await Promise.all([
      db.pharmacy.findUniqueOrThrow({
        where: { id: pharmacyId },
        include: {
          settings: true,
          owner: { select: { email: true } },
        },
      }),
      db.pharmacyInventory.count({
        where: {
          pharmacyId,
          active: true,
          publicListing: true,
          currentStock: { gt: 0 },
          price: { gt: 0 },
        },
      }),
      db.pharmacyService.count({
        where: { pharmacyId, active: true, description: { not: "" } },
      }),
      db.invoice.findUnique({ where: { number: `KYP-${pharmacyId}` } }),
      db.subscription.findFirst({
        where: {
          pharmacyId,
          status: "active",
          currentPeriodEnd: { gt: new Date() },
        },
      }),
      loadLatestVerificationProfile(pharmacyId),
    ]);

    const settings = p.settings;
    const hours = settings?.hours;
    const storefront = settings?.storefront;
    const gallery =
      storefront && typeof storefront === "object" && !Array.isArray(storefront)
        ? storefront.gallery
        : null;
    const verifiedAddress = verificationProfile?.profile.physicalAddress;
    const publicEmail = settings?.email || p.email || p.owner?.email || null;

    const checks: PharmacySetupCheck[] = [
      {
        key: "verification",
        ok: ["approved", "active"].includes(p.status),
        required: true,
        label: "Pharmacy verified",
        hint: "Premises, professional and ownership checks passed",
        href: "/onboard",
      },
      {
        key: "verification_fee",
        ok: invoice?.status === "paid",
        required: true,
        label: "Verification fee",
        hint: "KES 100 paid or promotional waiver applied",
        href: "/onboard/billing",
      },
      {
        key: "location",
        ok: Boolean(
          (settings?.city || p.city) &&
            (settings?.addressLine1 || verifiedAddress) &&
            (settings?.phone || p.phone) &&
            publicEmail &&
            (settings?.latitude ?? p.latitude) != null &&
            (settings?.longitude ?? p.longitude) != null,
        ),
        required: true,
        label: "Verified contact & location",
        hint: "Reused from the application you already verified",
        href: "/admin/setup",
      },
      {
        key: "hours",
        ok:
          Array.isArray(hours) &&
          hours.some(
            (h) =>
              h &&
              typeof h === "object" &&
              "day" in h &&
              "time" in h &&
              Boolean(h.day) &&
              Boolean(h.time),
          ),
        required: true,
        label: "Opening hours",
        hint: "Tell patients when the pharmacy is open",
        href: "/admin/setup?step=hours",
      },
      {
        key: "medicines",
        ok: medicines >= 3,
        required: true,
        label: "Starter medicines",
        hint: `${medicines}/3 ready with price, stock and public listing`,
        href: "/admin/setup?step=medicines",
      },
      {
        key: "services",
        ok: services > 0,
        required: true,
        label: "Pharmacy service",
        hint: services > 0 ? `${services} active service${services === 1 ? "" : "s"}` : "Add at least one service",
        href: "/admin/setup?step=services",
      },
      {
        key: "about",
        ok: Boolean((settings?.about || p.description || "").trim().length >= 50),
        required: true,
        label: "Public profile",
        hint: "A short description patients can trust",
        href: "/admin/setup?step=profile",
      },
      {
        key: "photos",
        ok: Boolean(settings?.logoUrl || p.logoUrl) && Boolean(settings?.coverImageUrl || p.coverImageUrl),
        required: false,
        label: "Brand photos",
        hint: "Optional during launch; add or improve them later",
        href: "/admin/settings/storefront",
      },
      {
        key: "gallery",
        ok:
          Array.isArray(gallery) &&
          gallery.some(
            (photo) => photo && typeof photo === "object" && "src" in photo && Boolean(photo.src),
          ),
        required: false,
        label: "Premises gallery",
        hint: "Optional during launch; add real premises photos later",
        href: "/admin/settings/storefront",
      },
      {
        key: "subscription",
        ok: Boolean(subscription),
        required: true,
        label: "Monthly platform service",
        hint: "KES 500/month active",
        href: "/onboard/billing",
      },
    ];

    const requiredChecks = checks.filter((check) => check.required);
    return {
      checks,
      ready: requiredChecks.every((check) => check.ok),
      profileReady: requiredChecks
        .filter((check) => check.key !== "subscription")
        .every((check) => check.ok),
      counts: { medicines, services },
    };
  });
}
