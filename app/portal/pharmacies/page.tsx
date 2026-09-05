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
        <p className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          You are not linked to a pharmacy yet. Join one below to see refills, loyalty, and orders.
        </p>
      )}

      {linked.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#7a8b84]">Linked to you</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {linked.map((row) => {
              const p = row.pharmacy;
              const active = tenant.pharmacyId === p.id;
              return (
                <li
                  key={p.id}
                  className={`rounded-2xl border p-4 ${
                    active ? "border-emerald-400 bg-emerald-50/70" : "border-teal-900/10 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#0c1a14]">{p.name}</p>
                      <p className="mt-0.5 text-xs text-[#5a6b62]">
                        {p.tagline || [p.city, p.county].filter(Boolean).join(" · ") || "Partner pharmacy"}
                      </p>
                      {row.preferred && (
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> Preferred
                        </p>
                      )}
                    </div>
                    <Store className="h-5 w-5 text-[#0d6e5a]" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!active && p.status === "active" && (
                      <form action={chooseCustomerPharmacyAction}>
                        <input type="hidden" name="pharmacyId" value={p.id} />
                        <button className="btn-primary h-9 px-3 text-xs" type="submit">
                          Open this pharmacy
                        </button>
                      </form>
                    )}
                    {active && (
                      <span className="inline-flex h-9 items-center rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white">
                        Viewing now
                      </span>
                    )}
                    <Link href={`/p/${p.slug}`} className="btn-ghost h-9 px-3 text-xs">
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

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#7a8b84]">Join another pharmacy</h2>
        {discover.length === 0 ? (
          <p className="mt-3 text-sm text-[#5a6b62]">You&apos;re already linked to every live pharmacy on the network.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {discover.map((p) => (
              <li key={p.id} className="rounded-2xl border border-teal-900/10 bg-white p-4">
                <p className="font-semibold text-[#0c1a14]">{p.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-[#5a6b62]">
                  <MapPin className="h-3 w-3" />
                  {[p.city, p.county].filter(Boolean).join(", ") || "Kenya"}
                </p>
                {p.tagline && <p className="mt-2 text-sm text-[#4b5d55]">{p.tagline}</p>}
                <form action={chooseCustomerPharmacyAction} className="mt-4">
                  <input type="hidden" name="pharmacyId" value={p.id} />
                  <button className="btn-primary h-9 px-3 text-xs" type="submit">
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
