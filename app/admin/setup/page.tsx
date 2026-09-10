import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Circle, MapPin, Phone, ShieldCheck, Clock, Rocket } from "lucide-react";
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
  const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId }, include: { settings: true } });
  if (!pharmacy) redirect("/onboard");

  const hoursOk = Boolean(pharmacy.settings?.hours && JSON.stringify(pharmacy.settings.hours) !== "[]");
  const phoneOk = Boolean(pharmacy.settings?.phone || pharmacy.phone);
  const cityOk = Boolean(pharmacy.city || pharmacy.settings?.city);
  const pinOk = (pharmacy.latitude != null && pharmacy.longitude != null) || (pharmacy.settings?.latitude != null && pharmacy.settings?.longitude != null);
  const verified = pharmacy.status === "approved" || pharmacy.status === "active";
  const checks = [
    { ok: Boolean(pharmacy.licenseNumber), label: "Licence number on file", hint: "Submitted with your application", href: "/onboard", icon: ShieldCheck },
    { ok: verified, label: "Network verification", hint: verified ? "Approved by the Aether team" : "Waiting for review", href: "/onboard", icon: ShieldCheck },
    { ok: cityOk && pinOk, label: "City & map pin", hint: pinOk ? "Pin saved" : "Confirm premises location for patients", href: "/admin/settings/location", icon: MapPin },
    { ok: phoneOk, label: "Public phone", hint: phoneOk ? "Shown on your storefront" : "Add a number patients can call", href: "/admin/settings/location", icon: Phone },
    { ok: hoursOk, label: "Opening hours", hint: hoursOk ? "Published" : "Tell patients when you are open", href: "/admin/settings/location", icon: Clock },
  ];
  const remaining = checks.filter((c) => !c.ok).length;
  const done = checks.length - remaining;
  const completion = Math.round((done / checks.length) * 100);
  const nextCheck = checks.find((c) => !c.ok);
  const NextCheckIcon = nextCheck?.icon;
  const canGoLive = remaining === 0 && verified;

  return (
    <AdminShell user={user} title="Getting ready to go live" subtitle={`Finish the highest-impact setup items for ${pharmacy.name}, then publish with confidence.`}>
      <div className="setup-ux max-w-4xl space-y-4 sm:space-y-6">
        <section className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] admin-accent-text"><Rocket className="h-4 w-4" /> Launch readiness</div>
              <p className="mt-2 text-2xl font-bold tracking-tight admin-text sm:text-3xl">{completion}% complete</p>
              <p className="mt-1 max-w-xl text-sm leading-6 admin-muted">{remaining === 0 ? "Core storefront requirements are complete. Review the status below and publish when ready." : `${remaining} item${remaining === 1 ? "" : "s"} left. Complete the next missing requirement instead of scanning the whole checklist.`}</p>
            </div>
            <div className="w-full sm:max-w-xs">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold admin-soft"><span>{done} of {checks.length}</span><span>{completion}%</span></div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[var(--admin-inset)]" role="progressbar" aria-label="Setup completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}>
                <div className="h-full rounded-full bg-[var(--admin-accent)] transition-[width] duration-500" style={{ width: `${completion}%` }} />
              </div>
            </div>
          </div>
        </section>

        {nextCheck && NextCheckIcon && (
          <Link href={nextCheck.href} className="group flex min-h-14 items-center gap-3 rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-accent-soft)] px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-panel)] admin-accent-text"><NextCheckIcon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-[11px] font-bold uppercase tracking-[0.12em] admin-soft">Recommended next</span><span className="mt-0.5 block text-sm font-semibold admin-text">{nextCheck.label}</span><span className="mt-0.5 block text-xs admin-muted">{nextCheck.hint}</span></span>
            <ArrowRight className="h-4 w-4 shrink-0 admin-accent-text transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}

        <ol className="grid gap-2.5 sm:gap-3">
          {checks.map((c, index) => {
            const Icon = c.icon;
            return (
              <li key={c.label} className={`rounded-2xl border p-3.5 sm:p-4 ${c.ok ? "border-emerald-500/25 bg-emerald-500/10" : "border-amber-500/25 bg-amber-500/10"}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${c.ok ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>{c.ok ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}</span>
                  <div className="min-w-0 flex-1"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-semibold admin-text"><span className="mr-2 text-xs admin-soft">{String(index + 1).padStart(2, "0")}</span>{c.label}</p><p className="mt-1 text-xs leading-5 admin-muted">{c.hint}</p></div>{!c.ok && <Link href={c.href} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2 text-xs font-semibold admin-accent-text transition hover:border-[var(--admin-border-2)] hover:bg-[var(--admin-inset)]"><Icon className="h-3.5 w-3.5" /> Complete</Link>}</div></div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 sm:p-5">
          <form action={goLiveAction}><button className="btn-primary min-h-11 w-full justify-center sm:w-auto" disabled={!canGoLive} type="submit">{canGoLive ? "List this pharmacy in the marketplace" : "Complete the checklist to go live"}</button></form>
          <p className="mt-3 text-xs admin-soft">Current status: {pharmacy.status.replace(/_/g, " ")}{pharmacy.listed ? " · listed" : " · not listed yet"}</p>
        </div>

        <style>{`
          @media (max-width: 639px) { .setup-ux ol a { width: 100%; } }
          @media (prefers-reduced-motion: reduce) { .setup-ux a, .setup-ux svg, .setup-ux [role="progressbar"] > div { transition: none !important; transform: none !important; } }
        `}</style>
      </div>
    </AdminShell>
  );
}
