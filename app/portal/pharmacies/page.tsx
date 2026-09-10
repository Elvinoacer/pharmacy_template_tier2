import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, Store, CheckCircle2, ArrowRight } from "lucide-react";
import { getSessionUser } from "@/app/lib/auth";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { prismaUnscoped } from "@/app/lib/db";
import { getTenant } from "@/app/lib/tenant";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { chooseCustomerPharmacyAction } from "@/app/actions/portal";

export const dynamic = "force-dynamic";
export const metadata = { title: "My pharmacies" };

export default async function PortalPharmaciesPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login?next=/portal/pharmacies");
  await requireOnboarded();

  const tenant = await getTenant().catch(() => ({ pharmacyId: null as string | null, slug: null as string | null }));

  const [linked, marketplace] = await Promise.all([
    prismaUnscoped.customerPharmacy.findMany({
      where: { customerId: user.customerId },
      include: {
        pharmacy: {
          select: {
            id: true,
            slug: true,
            name: true,
            tagline: true,
            city: true,
            county: true,
            status: true,
            listed: true,
            logoUrl: true,
          },
        },
      },
      orderBy: [{ preferred: "desc" }, { firstSeenAt: "asc" }],
    }),
    prismaUnscoped.pharmacy.findMany({
      where: { status: "active", listed: true },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        tagline: true,
        city: true,
        county: true,
        logoUrl: true,
      },
    }),
  ]);

  const linkedIds = new Set(linked.map((l) => l.pharmacyId));
  const discover = marketplace.filter((p) => !linkedIds.has(p.id));

  return (
    <PortalShell
      user={user}
      title="My pharmacies"
      subtitle="One account across the network. Choose which pharmacy's prescriptions, loyalty, and messages you want to open."
    >
      {linked.length === 0 && (
        <p className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          You are not linked to a pharmacy yet. Join one below to see refills, loyalty, and orders.
        </p>
      )}

      {linked.length > 0 && (
        <section className="mb-8 min-w-0 sm:mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#7a8b84] dark:text-slate-400 sm:text-sm">Linked to you</h2>
          <ul className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
            {linked.map((row) => {
              const p = row.pharmacy;
              const active = tenant.pharmacyId === p.id;
              return (
                <li
                  key={p.id}
                  className={`min-w-0 rounded-2xl border p-4 transition sm:p-5 ${
                    active
                      ? "border-emerald-400 bg-emerald-50/70 dark:border-emerald-500/40 dark:bg-emerald-500/10"
                      : "border-teal-900/10 bg-white dark:border-white/10 dark:bg-white/[0.035]"
                  }`}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold text-[#0c1a14] dark:text-slate-100">{p.name}</p>
                      <p className="mt-0.5 break-words text-xs leading-relaxed text-[#5a6b62] dark:text-slate-400">
                        {p.tagline || [p.city, p.county].filter(Boolean).join(" · ") || "Partner pharmacy"}
                      </p>
                      {row.preferred && (
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> Preferred
                        </p>
                      )}
                    </div>
                    <Store className="h-5 w-5 shrink-0 text-[#0d6e5a] dark:text-teal-300" />
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
                    {!active && p.status === "active" && (
                      <form action={chooseCustomerPharmacyAction} className="min-w-0">
                        <input type="hidden" name="pharmacyId" value={p.id} />
                        <button className="btn-primary min-h-10 w-full px-3 text-xs sm:w-auto" type="submit">
                          Open this pharmacy
                        </button>
                      </form>
                    )}
                    {active && (
                      <span className="inline-flex min-h-10 items-center justify-center rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white dark:bg-emerald-500">
                        Viewing now
                      </span>
                    )}
                    <Link href={`/p/${p.slug}`} className="btn-ghost min-h-10 w-full justify-center px-3 text-xs sm:w-auto">
                      Storefront
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="min-w-0">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#7a8b84] dark:text-slate-400 sm:text-sm">Join another pharmacy</h2>
        {discover.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-[#5a6b62] dark:text-slate-400">You&apos;re already linked to every live pharmacy on the network.</p>
        ) : (
          <ul className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
            {discover.map((p) => (
              <li key={p.id} className="min-w-0 rounded-2xl border border-teal-900/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.035] sm:p-5">
                <p className="break-words font-semibold text-[#0c1a14] dark:text-slate-100">{p.name}</p>
                <p className="mt-0.5 flex min-w-0 items-start gap-1 text-xs text-[#5a6b62] dark:text-slate-400">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="min-w-0 break-words">{[p.city, p.county].filter(Boolean).join(", ") || "Kenya"}</span>
                </p>
                {p.tagline && <p className="mt-2 break-words text-sm leading-relaxed text-[#4b5d55] dark:text-slate-300">{p.tagline}</p>}
                <form action={chooseCustomerPharmacyAction} className="mt-4">
                  <input type="hidden" name="pharmacyId" value={p.id} />
                  <button className="btn-primary min-h-10 w-full px-3 text-xs sm:w-auto" type="submit">
                    Join &amp; earn welcome points
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PortalShell>
  );
}
