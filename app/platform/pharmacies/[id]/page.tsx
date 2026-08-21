import { notFound } from "next/navigation";
import { prismaUnscoped } from "@/app/lib/db";
import {
  impersonatePharmacyAction,
  reviewPharmacyAction,
  setPharmacyLiveAction,
} from "@/app/actions/platform";

export const dynamic = "force-dynamic";

export default async function PharmacyReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pharmacy = await prismaUnscoped.pharmacy
    .findUnique({
      where: { id },
      include: {
        owner: { select: { email: true, platformAdmin: true } },
        memberships: { include: { user: { select: { email: true, role: true } } } },
        onboardingEvents: { orderBy: { createdAt: "desc" }, take: 12 },
      },
    })
    .catch(() => null);
  if (!pharmacy) notFound();

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-teal-200/70">Tenant</p>
        <h1 className="mt-1 text-3xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>
          {pharmacy.name}
        </h1>
        <p className="mt-2 text-sm text-teal-100/70">
          /p/{pharmacy.slug} · {pharmacy.legalName || "—"} · {pharmacy.status.replace("_", " ")}
        </p>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          {[
            ["Licence", pharmacy.licenseNumber],
            ["PPB premises", pharmacy.ppbPremisesNumber],
            ["Phone", pharmacy.phone],
            ["Email", pharmacy.email],
            ["City", pharmacy.city],
            ["County", pharmacy.county],
            ["Owner", pharmacy.owner?.email],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-white/10 px-3 py-2">
              <dt className="text-[11px] uppercase tracking-wide text-teal-100/50">{k}</dt>
              <dd className="mt-0.5">{v || "—"}</dd>
            </div>
          ))}
        </dl>

        <form action={reviewPharmacyAction} className="mt-8 space-y-3 rounded-2xl border border-white/10 p-4">
          <input type="hidden" name="pharmacyId" value={pharmacy.id} />
          <label className="block text-sm">
            Review notes (visible in the onboarding timeline)
            <textarea name="notes" rows={3} className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 p-2 text-sm" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button name="decision" value="under_review" className="rounded-full border border-white/20 px-3 py-1.5 text-xs">
              Mark in review
            </button>
            <button name="decision" value="needs_info" className="rounded-full border border-amber-300/40 px-3 py-1.5 text-xs text-amber-100">
              Request info
            </button>
            <button name="decision" value="approve" className="rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-emerald-950">
              Approve
            </button>
            <button name="decision" value="reject" className="rounded-full border border-rose-400/40 px-3 py-1.5 text-xs text-rose-100">
              Reject
            </button>
          </div>
        </form>

        <form action={setPharmacyLiveAction} className="mt-4 flex flex-wrap gap-3 rounded-2xl border border-white/10 p-4 text-sm">
          <input type="hidden" name="pharmacyId" value={pharmacy.id} />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="listed" value="true" defaultChecked={pharmacy.listed} /> Listed
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="featured" value="true" defaultChecked={pharmacy.featured} /> Featured
          </label>
          <button type="submit" className="rounded-full bg-white/10 px-3 py-1 text-xs">
            Save flags
          </button>
          <button name="suspend" value="true" className="rounded-full border border-rose-400/30 px-3 py-1 text-xs">
            Suspend
          </button>
          <button name="restore" value="true" className="rounded-full border border-emerald-400/30 px-3 py-1 text-xs">
            Restore & list
          </button>
        </form>

        <form action={impersonatePharmacyAction} className="mt-4">
          <input type="hidden" name="pharmacyId" value={pharmacy.id} />
          <button className="text-xs text-teal-200 underline">Open this pharmacy's admin (support view)</button>
        </form>
      </div>

      <aside>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-100/70">Staff</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {pharmacy.memberships.map((m) => (
            <li key={m.id} className="rounded-xl border border-white/10 px-3 py-2">
              {m.user.email}
              <span className="ml-2 text-[11px] uppercase text-teal-100/50">{m.role}</span>
            </li>
          ))}
        </ul>
        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-teal-100/70">Timeline</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {pharmacy.onboardingEvents.map((e) => (
            <li key={e.id} className="border-l border-white/15 pl-3">
              <p className="text-[11px] uppercase text-teal-100/50">{e.type}</p>
              <p>{e.message}</p>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
