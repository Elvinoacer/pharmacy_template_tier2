import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { AdminShell } from "@/app/components/admin/AdminShell";
import LocationSettingsForm from "@/app/components/admin/LocationSettingsForm";
import { MapPinned } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pharmacy location" };

export default async function AdminLocationSettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin/settings/location");
  const pharmacyId = user.activePharmacyId || user.memberships[0]?.pharmacyId;
  if (!pharmacyId) redirect("/onboard");
  const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId }, include: { settings: true } });
  if (!pharmacy) redirect("/onboard");

  const row = pharmacy.settings;
  const hoursArr = Array.isArray(row?.hours) ? (row!.hours as { day?: string; time?: string }[]) : [];
  const hoursText = hoursArr.map((h) => {
    const day = typeof h === "object" && h && "day" in h ? String(h.day || "") : "";
    const time = typeof h === "object" && h && "time" in h ? String(h.time || "") : "";
    return day && time ? `${day} | ${time}` : "";
  }).filter(Boolean).join("\n");

  const defaults = {
    displayName: row?.displayName?.trim() || pharmacy.name,
    phone: row?.phone?.trim() || pharmacy.phone || "",
    email: row?.email?.trim() || pharmacy.email || user.email || "",
    whatsapp: row?.whatsapp?.trim() || pharmacy.whatsapp || "",
    addressLine1: row?.addressLine1?.trim() || "",
    addressLine2: row?.addressLine2?.trim() || "",
    city: row?.city?.trim() || pharmacy.city || "",
    state: row?.state?.trim() || pharmacy.county || "",
    zip: row?.zip?.trim() || "",
    country: row?.country?.trim() || pharmacy.country || "Kenya",
    latitude: row?.latitude != null ? String(row.latitude) : pharmacy.latitude != null ? String(pharmacy.latitude) : "",
    longitude: row?.longitude != null ? String(row.longitude) : pharmacy.longitude != null ? String(pharmacy.longitude) : "",
    placeId: row?.placeId || "",
    mapsEmbedUrl: row?.mapsEmbedUrl || "",
    hoursText,
  };

  return (
    <AdminShell user={user} title="Pharmacy details" subtitle={`Keep ${pharmacy.name} easy to find, contact, and trust across every screen size.`}>
      <div className="location-settings-ux max-w-5xl space-y-4 sm:space-y-5">
        <div className="flex items-start gap-2.5 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-accent-soft)] px-3.5 py-3 text-xs leading-5 admin-muted sm:px-4">
          <MapPinned className="mt-0.5 h-4 w-4 shrink-0 admin-accent-text" />
          <p><strong className="admin-text">Best order:</strong> confirm the map pin first, then public contact details and opening hours. The live preview lets you validate directions before saving.</p>
        </div>
        <LocationSettingsForm defaults={defaults} pharmacyName={pharmacy.name} />
        <style>{`
          .location-settings-ux {
            color: var(--admin-text);
          }

          .location-settings-ux > form {
            max-width: 100%;
          }

          .location-settings-ux input,
          .location-settings-ux textarea,
          .location-settings-ux select {
            max-width: 100%;
          }

          .location-settings-ux iframe {
            min-height: 14rem;
            background: var(--admin-card-2);
            transition: filter 180ms ease, opacity 180ms ease;
          }

          /* The form predates the admin token system in a few places.
             Normalize those exceptional surfaces against the resolved admin theme
             instead of relying on Tailwind's OS-level dark variant. */
          .location-settings-ux [class*="from-teal-50"] {
            background: linear-gradient(145deg, var(--admin-card), var(--admin-card-2)) !important;
            border-color: var(--admin-border-2) !important;
            color: var(--admin-text) !important;
            box-shadow: var(--admin-shadow);
          }

          .location-settings-ux [class*="border-teal-900/10"] {
            border-color: var(--admin-border-2) !important;
          }

          .location-settings-ux [class*="hover:bg-slate-50"]:hover {
            background: var(--admin-hover) !important;
          }

          .location-settings-ux [class*="text-teal-800"] {
            color: var(--admin-accent-text) !important;
          }

          .location-settings-ux [class*="border-teal-600/30"] {
            border-color: var(--admin-border-2) !important;
          }

          .location-settings-ux [class*="bg-teal-500/10"] {
            background: var(--admin-accent-soft) !important;
          }

          .location-settings-ux [class*="hover:bg-teal-500/15"]:hover {
            background: var(--admin-hover) !important;
          }

          .location-settings-ux [class*="text-rose-700"] {
            color: var(--danger) !important;
          }

          .location-settings-ux [class*="text-emerald-800"] {
            color: var(--success) !important;
          }

          .location-settings-ux .admin-card,
          .location-settings-ux [class*="bg-[var(--admin-card)]"] {
            color: var(--admin-text);
          }

          .shell-grid-admin[data-theme="dark"] .location-settings-ux iframe,
          html[data-admin-theme="dark"] .location-settings-ux iframe {
            filter: brightness(.82) contrast(1.08) saturate(.82);
          }

          .shell-grid-admin[data-theme="light"] .location-settings-ux iframe,
          html[data-admin-theme="light"] .location-settings-ux iframe {
            filter: none;
          }

          @media (prefers-reduced-motion: reduce) {
            .location-settings-ux iframe,
            .location-settings-ux button,
            .location-settings-ux a {
              transition: none !important;
            }
          }

          @media (max-width: 639px) {
            .location-settings-ux form {
              gap: 14px;
            }

            .location-settings-ux form > div {
              border-radius: 16px !important;
            }

            .location-settings-ux form > div[class*="p-5"],
            .location-settings-ux form > div[class*="sm:p-6"] {
              padding: 16px !important;
            }

            .location-settings-ux form button[type="button"],
            .location-settings-ux form button[type="submit"],
            .location-settings-ux form a[href="/admin/setup"] {
              width: 100%;
              min-height: 44px;
              justify-content: center;
            }

            .location-settings-ux iframe {
              height: 13rem !important;
              min-height: 13rem;
            }
          }
        `}</style>
      </div>
    </AdminShell>
  );
}
