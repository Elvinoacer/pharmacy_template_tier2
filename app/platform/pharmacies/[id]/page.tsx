import Link from "next/link";
import { notFound } from "next/navigation";
import { prismaUnscoped } from "@/app/lib/db";
import {
  impersonatePharmacyAction,
  reviewPharmacyAction,
  setPharmacyLiveAction,
  suspendPharmacyAction,
  updatePharmacyAction,
} from "@/app/actions/platform";

export const dynamic = "force-dynamic";

const inputCls =
  "mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-teal-100/35 focus:border-teal-300/40";

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
    <div>
      <Link href="/platform/pharmacies" className="text-xs text-teal-200/70 hover:text-white">
        ← All pharmacies
      </Link>

      <div className="mt-3 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-teal-200/70">Tenant</p>
          <h1 className="mt-1 text-3xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>
            {pharmacy.name}
          </h1>
          <p className="mt-2 text-sm text-teal-100/70">
            /p/{pharmacy.slug} · {pharmacy.legalName || "—"} ·{" "}
            <span className="uppercase">{pharmacy.status.replace("_", " ")}</span>
            {pharmacy.featured && <span className="ml-2 text-amber-200">· Featured</span>}
            {pharmacy.listed && <span className="ml-2 text-emerald-300">· Listed</span>}
          </p>

          {/* Tenant edit */}
          <form action={updatePharmacyAction} className="mt-8 rounded-2xl border border-white/10 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-100/70">
              Edit tenant details
            </h2>
            <input type="hidden" name="pharmacyId" value={pharmacy.id} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                Display name
                <input name="name" defaultValue={pharmacy.name} required className={inputCls} />
              </label>
              <label className="block text-sm">
                Storefront slug (/p/…)
                <input name="slug" defaultValue={pharmacy.slug} required pattern="[a-z0-9][a-z0-9-]{1,60}" className={inputCls} />
              </label>
              <label className="block text-sm">
                Legal name
                <input name="legalName" defaultValue={pharmacy.legalName ?? ""} className={inputCls} />
              </label>
              <label className="block text-sm">
                PPB / premises licence
                <input name="licenseNumber" defaultValue={pharmacy.licenseNumber ?? ""} className={inputCls} />
              </label>
              <label className="block text-sm">
                Phone
                <input name="phone" type="tel" defaultValue={pharmacy.phone ?? ""} className={inputCls} />
              </label>
              <label className="block text-sm">
                WhatsApp
                <input name="whatsapp" type="tel" defaultValue={pharmacy.whatsapp ?? ""} className={inputCls} />
              </label>
              <label className="block text-sm">
                Email
                <input name="email" type="email" defaultValue={pharmacy.email ?? ""} className={inputCls} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  City
                  <input name="city" defaultValue={pharmacy.city ?? ""} className={inputCls} />
                </label>
                <label className="block text-sm">
                  County
                  <input name="county" defaultValue={pharmacy.county ?? ""} className={inputCls} />
                </label>
              </div>
            </div>
            <button
              type="submit"
              className="mt-4 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-[#071512] hover:bg-teal-100"
            >
              Save tenant
            </button>
          </form>

          {/* Verification decision */}
          <form action={reviewPharmacyAction} className="mt-4 space-y-3 rounded-2xl border border-white/10 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-100/70">
              Verification decision
            </h2>
            <input type="hidden" name="pharmacyId" value={pharmacy.id} />
            <label className="block text-sm">
              Review notes (visible in the onboarding timeline)
              <textarea name="notes" rows={3} className={inputCls} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button name="decision" value="under_review" className="rounded-full border border-white/20 px-3 py-1.5 text-xs hover:bg-white/5">
                Mark in review
              </button>
              <button name="decision" value="needs_info" className="rounded-full border border-amber-300/40 px-3 py-1.5 text-xs text-amber-100 hover:bg-white/5">
                Request info
              </button>
              <button name="decision" value="approve" className="rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-emerald-950">
                Approve
              </button>
              <button name="decision" value="reject" className="rounded-full border border-rose-400/40 px-3 py-1.5 text-xs text-rose-100 hover:bg-white/5">
                Reject
              </button>
            </div>
          </form>

          {/* Listing flags */}
          <form action={setPharmacyLiveAction} className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 p-4 text-sm">
            <input type="hidden" name="pharmacyId" value={pharmacy.id} />
            <label className="flex items-center gap-2">
              <input type="checkbox" name="listed" value="true" defaultChecked={pharmacy.listed} /> Listed
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="featured" value="true" defaultChecked={pharmacy.featured} /> Featured
            </label>
            <button type="submit" className="rounded-full bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15">
              Save flags
            </button>
          </form>

          {/* Suspension with reason */}
          <form action={suspendPharmacyAction} className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-400/5 p-4">
            <input type="hidden" name="pharmacyId" value={pharmacy.id} />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-rose-100/80">
              Suspend tenant
            </h2>
            <p className="mt-1 text-xs text-teal-100/60">
              Suspends the storefront and blocks staff access. The reason is recorded on the timeline
              and in the audit log.
            </p>
            <label className="mt-3 block text-sm">
              Reason
              <input name="reason" required placeholder="e.g. Licence expired — pending PPB renewal" className={inputCls} />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-full border border-rose-400/50 px-3 py-1.5 text-xs text-rose-100 hover:bg-rose-400/10"
              >
                Suspend
              </button>
            </div>
          </form>

          <form action={setPharmacyLiveAction} className="mt-4 flex flex-wrap gap-3 rounded-2xl border border-emerald-400/20 p-4 text-sm">
            <input type="hidden" name="pharmacyId" value={pharmacy.id} />
            <button name="restore" value="true" className="rounded-full border border-emerald-400/40 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-400/10">
              Restore &amp; list
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <form action={impersonatePharmacyAction}>
              <input type="hidden" name="pharmacyId" value={pharmacy.id} />
              <button className="text-xs text-teal-200 underline">Open this pharmacy&apos;s admin (support view)</button>
            </form>
            <Link href={`/p/${pharmacy.slug}`} className="text-xs text-teal-200 underline" target="_blank" rel="noopener noreferrer">
              Visit storefront ↗
            </Link>
            {pharmacy.owner && (
              <a href={`mailto:${pharmacy.owner.email}`} className="text-xs text-teal-200 underline">
                Email owner ({pharmacy.owner.email})
              </a>
            )}
          </div>
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
            {pharmacy.memberships.length === 0 && (
              <li className="text-xs text-teal-100/50">No staff memberships.</li>
            )}
          </ul>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-teal-100/70">Timeline</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {pharmacy.onboardingEvents.map((e) => (
              <li key={e.id} className="border-l border-white/15 pl-3">
                <p className="text-[11px] uppercase text-teal-100/50">
                  {e.type} · {new Date(e.createdAt).toLocaleDateString("en-KE")}
                </p>
                <p>{e.message}</p>
              </li>
            ))}
            {pharmacy.onboardingEvents.length === 0 && (
              <li className="text-xs text-teal-100/50">No events yet.</li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}
