import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { AdminShell } from "@/app/components/admin/AdminShell";
import LocationSettingsForm from "@/app/components/admin/LocationSettingsForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pharmacy location" };

export default async function AdminLocationSettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin/settings/location");

  const pharmacyId = user.activePharmacyId || user.memberships[0]?.pharmacyId;
  if (!pharmacyId) redirect("/onboard");

  const pharmacy = await prismaUnscoped.pharmacy.findUnique({
    where: { id: pharmacyId },
    include: { settings: true },
  });
  if (!pharmacy) redirect("/onboard");

  const row = pharmacy.settings;
  const hoursArr = Array.isArray(row?.hours)
    ? (row!.hours as { day?: string; time?: string }[])
    : [];

  const hoursText = hoursArr
    .map((h) => {
      const day = typeof h === "object" && h && "day" in h ? String(h.day || "") : "";
      const time = typeof h === "object" && h && "time" in h ? String(h.time || "") : "";
      return day && time ? `${day} | ${time}` : "";
    })
    .filter(Boolean)
    .join("\n");

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
    latitude:
      row?.latitude != null
        ? String(row.latitude)
        : pharmacy.latitude != null
          ? String(pharmacy.latitude)
          : "",
    longitude:
      row?.longitude != null
        ? String(row.longitude)
        : pharmacy.longitude != null
          ? String(pharmacy.longitude)
          : "",
    placeId: row?.placeId || "",
    mapsEmbedUrl: row?.mapsEmbedUrl || "",
    hoursText,
  };

  return (
    <AdminShell
      user={user}
      title="Confirm location & contact"
      subtitle={`Finish the public profile for ${pharmacy.name} — only fill what is still missing.`}
    >
      <LocationSettingsForm defaults={defaults} pharmacyName={pharmacy.name} />
    </AdminShell>
  );
}
