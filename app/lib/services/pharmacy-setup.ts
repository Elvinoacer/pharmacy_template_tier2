import "server-only";
import { withPharmacy } from "@/app/lib/tenant-context";
import { prismaUnscoped as db } from "@/app/lib/db";

export async function loadPharmacySetup(pharmacyId: string) {
  return withPharmacy(pharmacyId, async () => {
  const [p, medicines, services, invoice, subscription] = await Promise.all([
    db.pharmacy.findUniqueOrThrow({ where: { id: pharmacyId }, include: { settings: true } }),
    db.pharmacyInventory.count({ where: { pharmacyId, active: true, publicListing: true, currentStock: { gt: 0 }, price: { gt: 0 } } }),
    db.pharmacyService.count({ where: { pharmacyId, active: true, description: { not: "" } } }),
    db.invoice.findUnique({ where: { number: `KYP-${pharmacyId}` } }),
    db.subscription.findFirst({ where: { pharmacyId, status: "active", currentPeriodEnd: { gt: new Date() } } }),
  ]);
  const settings = p.settings;
  const hours = settings?.hours;
  const storefront = settings?.storefront;
  const gallery = storefront && typeof storefront === "object" && !Array.isArray(storefront) ? storefront.gallery : null;
  const checks = [
    { ok: ["approved", "active"].includes(p.status), label: "Independent KYP approval", hint: "Premises, professional and business evidence verified", href: "/onboard" },
    { ok: invoice?.status === "paid", label: "Verification fee", hint: "KES 100 once, or an allocated promotional waiver", href: "/onboard/billing" },
    { ok: Boolean((settings?.city || p.city) && (settings?.addressLine1) && (settings?.phone || p.phone) && (settings?.email || p.email) && (settings?.latitude ?? p.latitude) != null && (settings?.longitude ?? p.longitude) != null), label: "Location & contact details", hint: "Street address, city, map pin, email and public phone", href: "/admin/settings/location" },
    { ok: Array.isArray(hours) && hours.some(h => h && typeof h === "object" && "day" in h && "time" in h && Boolean(h.day) && Boolean(h.time)), label: "Opening hours", hint: "Let patients know when they can visit", href: "/admin/settings/location" },
    { ok: medicines >= 3, label: "At least 3 medicines ready to sell", hint: `${medicines}/3 with a price, available stock and public listing enabled`, href: "/admin/medications" },
    { ok: services > 0, label: "Your pharmacy services", hint: "Describe at least one service you actually offer", href: "/admin/services" },
    { ok: Boolean((settings?.about || p.description || "").trim().length >= 50), label: "About your pharmacy", hint: "Introduce your team and care in at least 50 characters", href: "/admin/settings/storefront" },
    { ok: Boolean(settings?.logoUrl || p.logoUrl) && Boolean(settings?.coverImageUrl || p.coverImageUrl), label: "Brand & premises photos", hint: "Add your logo and a real cover photo; complete your gallery in Storefront Studio", href: "/admin/settings/storefront" },
    { ok: Array.isArray(gallery) && gallery.some(photo => photo && typeof photo === "object" && "src" in photo && Boolean(photo.src)), label: "Your premises gallery", hint: "Add at least one real photo in Storefront Studio", href: "/admin/settings/storefront" },
    { ok: Boolean(subscription), label: "Monthly platform service", hint: "KES 500/month; activate after completing your profile", href: "/onboard/billing" },
  ];
  return { checks, ready: checks.every(c => c.ok), profileReady: checks.slice(0, -1).every(c => c.ok) };
  });
}
