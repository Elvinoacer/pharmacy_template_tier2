import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Circle, MapPin, Phone, ShieldCheck, Clock } from "lucide-react";
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

  const hoursOk = Boolean(
    pharmacy.settings?.hours && JSON.stringify(pharmacy.settings.hours) !== "[]",
  );
  const phoneOk = Boolean(pharmacy.settings?.phone || pharmacy.phone);
  const cityOk = Boolean(pharmacy.city || pharmacy.settings?.city);
  const pinOk =
    (pharmacy.latitude != null && pharmacy.longitude != null) ||
    (pharmacy.settings?.latitude != null && pharmacy.settings?.longitude != null);
  const verified = pharmacy.status === "approved" || pharmacy.status === "active";

  const checks = [
    {
      ok: Boolean(pharmacy.licenseNumber),
      label: "Licence number on file",
      hint: "Submitted with your application",
      href: "/onboard",
      icon: ShieldCheck,
    },
    {
      ok: verified,
      label: "Network verification",
      hint: verified ? "Approved by the Aether team" : "Waiting for review",
      href: "/onboard",
      icon: ShieldCheck,
    },
    {
      ok: cityOk && pinOk,
      label: "City & map pin",
      hint: pinOk ? "Pin saved" : "Confirm premises location for patients",
      href: "/admin/settings/location",
      icon: MapPin,
    },
    {
      ok: phoneOk,
      label: "Public phone",
      hint: phoneOk ? "Shown on your storefront" : "Add a number patients can call",
      href: "/admin/settings/location",
      icon: Phone,
    },
    {
      ok: hoursOk,
      label: "Opening hours",
      hint: hoursOk ? "Published" : "Tell patients when you are open",
      href: "/admin/settings/location",
      icon: Clock,
    },
  ];
  const remaining = checks.filter((c) => !c.ok).length;
  const done = checks.length - remaining;
  const canGoLive =
    remaining === 0 && (pharmacy.status === "approved" || pharmacy.status === "active");

  return (
    <AdminShell
      user={user}
      title="Getting ready to go live"
      subtitle={`Finish setup for ${pharmacy.name} before listing in the marketplace.`}
    >
      <div className="mb-6 rounded-2xl border border-teal-900/10 bg-gradient-to-br from-teal-50/90 to-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--admin-accent-text)]">
              Progress
            </p>
            <p className="mt-1 text-2xl font-semibold text-[var(--admin-text)]" style={{ fontFamily: "var(--font-display), serif" }}>
              {done} of {checks.length} complete
            </p>
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
              {remaining === 0
                ? "You are ready to list in the marketplace."
                : `${remaining} item${remaining === 1 ? "" : "s"} left — start with location if the pin is missing.`}
            </p>
          </div>
          <div className="h-2 w-full max-w-[12rem] overflow-hidden rounded-full bg-teal-900/10 sm:w-40">
            <div
              className="h-full rounded-full bg-[#0d6e5a] transition-all"
              style={{ width: `${Math.round((done / checks.length) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <ol className="space-y-3">
        {checks.map((c) => {
          const Icon = c.icon;
          return (
            <li
              key={c.label}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${
                c.ok
                  ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-950"
                  : "border-amber-200/80 bg-amber-50/60 text-amber-950"
              }`}
            >
              <span className="mt-0.5 shrink-0">
                {c.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 text-amber-600/80" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{c.label}</p>
                  {!c.ok && (
                    <Link
                      href={c.href}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2.5 py-1 text-xs font-semibold text-[var(--admin-accent-text)] shadow-sm ring-1 ring-teal-900/10 hover:bg-[var(--admin-card)]"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      Complete
                    </Link>
                  )}
                </div>
                <p className={`mt-0.5 text-xs ${c.ok ? "text-emerald-800/80" : "text-amber-900/70"}`}>
                  {c.hint}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <form action={goLiveAction} className="mt-8">
        <button
          className="btn-primary w-full justify-center sm:w-auto"
          disabled={!canGoLive}
          type="submit"
        >
          {canGoLive ? "List this pharmacy in the marketplace" : "Complete the checklist to go live"}
        </button>
      </form>
      <p className="mt-3 text-xs text-[var(--admin-text-soft)]">
        Current status: {pharmacy.status.replace(/_/g, " ")}
        {pharmacy.listed ? " · listed" : " · not listed yet"}
      </p>
    </AdminShell>
  );
}
