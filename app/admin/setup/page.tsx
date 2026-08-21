import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { goLiveAction } from "@/app/actions/tenant-admin";
import { AdminShell } from "@/app/components/admin/AdminShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pharmacy setup" };

export default async function AdminSetupPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin/setup");
  const pharmacyId = user.activePharmacyId || user.memberships[0]?.pharmacyId;
  if (!pharmacyId) redirect("/onboard");
  const pharmacy = await prismaUnscoped.pharmacy.findUnique({
    where: { id: pharmacyId },
    include: { settings: true },
  });
  if (!pharmacy) redirect("/onboard");

  const checks = [
    { ok: Boolean(pharmacy.licenseNumber), label: "Licence number on file", href: "/onboard" },
    { ok: Boolean(pharmacy.settings?.hours && JSON.stringify(pharmacy.settings.hours) !== "[]"), label: "Opening hours", href: "/admin/settings/location" },
    { ok: Boolean(pharmacy.settings?.phone || pharmacy.phone), label: "Public phone", href: "/admin/settings/location" },
    { ok: Boolean(pharmacy.city), label: "City / location", href: "/admin/settings/location" },
    { ok: pharmacy.status === "approved" || pharmacy.status === "active", label: "Network verification", href: "/onboard" },
  ];
  const remaining = checks.filter((c) => !c.ok).length;

  return (
    <AdminShell user={user} title="Go-live checklist" subtitle={`Finish setup for ${pharmacy.name} before listing in the marketplace.`}>
      <ol className="space-y-3">
        {checks.map((c) => (
          <li
            key={c.label}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
              c.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"
            }`}
          >
            <span>{c.ok ? "Done" : "To do"} — {c.label}</span>
            {!c.ok && (
              <Link href={c.href} className="text-xs font-semibold underline">
                Open
              </Link>
            )}
          </li>
        ))}
      </ol>
      <form action={goLiveAction} className="mt-8">
        <button className="btn-primary" disabled={remaining > 0 && pharmacy.status === "draft"} type="submit">
          List this pharmacy in the marketplace
        </button>
      </form>
      <p className="mt-3 text-xs text-[#7a8b84]">
        Current status: {pharmacy.status.replace("_", " ")} {pharmacy.listed ? "· listed" : "· not listed"}
      </p>
    </AdminShell>
  );
}
