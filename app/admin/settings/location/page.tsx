import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { pharmacy as staticPharmacy } from "@/app/lib/data";
import { AdminShell } from "@/app/components/admin/AdminShell";
import LocationSettingsForm from "@/app/components/admin/LocationSettingsForm";

export const metadata = { title: "Pharmacy location" };

export default async function AdminLocationSettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const row = await prisma.pharmacySettings.findUnique({ where: { id: "default" } });

  const hoursArr = Array.isArray(row?.hours)
    ? (row!.hours as { day?: string; time?: string }[])
    : staticPharmacy.hours;

  const hoursText = hoursArr
    .map((h) => {
      const day = typeof h === "object" && h && "day" in h ? String(h.day || "") : "";
      const time = typeof h === "object" && h && "time" in h ? String(h.time || "") : "";
      return day && time ? `${day} | ${time}` : "";
    })
    .filter(Boolean)
    .join("\n");

  const defaults = {
    displayName: row?.displayName || staticPharmacy.name,
    phone: row?.phone || staticPharmacy.phone,
    email: row?.email || staticPharmacy.email,
    whatsapp: row?.whatsapp || staticPharmacy.whatsapp,
    addressLine1: row?.addressLine1 || staticPharmacy.address.street,
    addressLine2: row?.addressLine2 || "",
    city: row?.city || staticPharmacy.address.city,
    state: row?.state || staticPharmacy.address.state,
    zip: row?.zip || staticPharmacy.address.zip,
    country: row?.country || "Kenya",
    latitude: row?.latitude != null ? String(row.latitude) : "",
    longitude: row?.longitude != null ? String(row.longitude) : "",
    placeId: row?.placeId || "",
    mapsEmbedUrl: row?.mapsEmbedUrl || "",
    hoursText:
      hoursText ||
      staticPharmacy.hours.map((h) => `${h.day} | ${h.time}`).join("\n"),
  };

  return (
    <AdminShell
      user={user}
      title="Pharmacy location"
      subtitle="Set your pin once — public contact page map and Get directions update automatically."
    >
      <LocationSettingsForm defaults={defaults} />
    </AdminShell>
  );
}
