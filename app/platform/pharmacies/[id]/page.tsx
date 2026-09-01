import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { prismaUnscoped } from "@/app/lib/db";
import {
  impersonatePharmacyAction,
  setPharmacyLiveAction,
  suspendPharmacyAction,
  updatePharmacyAction,
} from "@/app/actions/platform";
import ReviewDecisionForm from "@/app/components/platform/ReviewDecisionForm";
import {
  daysSince,
  formatStatus,
  priorityBadgeClass,
  priorityLabel,
  statusBadgeClass,
  verificationPriority,
} from "@/app/components/platform/status";

export const dynamic = "force-dynamic";

const inputCls =
  "mt-1.5 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm outline-none placeholder:text-teal-100/35 focus:border-teal-300/40";

export default async function PharmacyReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pharmacy = await prismaUnscoped.pharmacy
    .findUnique({
      where: { id },
      include: {
        owner: { select: { email: true, platformAdmin: true } },
        memberships: { include: { user: { select: { email: true, role: true } } } },
        onboardingEvents: { orderBy: { createdAt: "desc" }, take: 12 },
        settings: true,
      },
    })
    .catch(() => null);
  if (!pharmacy) notFound();

  const priority = verificationPriority(
    pharmacy.status,
    pharmacy.submittedAt,
    pharmacy.createdAt,
  );
  const age = daysSince(pharmacy.submittedAt ?? pharmacy.createdAt);
  const hasPin = pharmacy.latitude != null && pharmacy.longitude != null;
  const mapEmbed = hasPin
    ? `https://maps.google.com/maps?q=${pharmacy.latitude},${pharmacy.longitude}&z=16&output=embed`
    : null;

  const checks = [
    { ok: Boolean(pharmacy.licenseNumber), label: "Licence number" },
    { ok: Boolean(pharmacy.city), label: "City" },
    { ok: hasPin, label: "Map pin" },
    { ok: Boolean(pharmacy.phone), label: "Public phone" },
    { ok: Boolean(pharmacy.owner?.email || pharmacy.email), label: "Owner contact" },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/platform/applications"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-200/80 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to queue
      </Link>

      {/* Header */}
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-transparent p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadgeClass(pharmacy.status)}`}
              >
                {formatStatus(pharmacy.status)}
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priorityBadgeClass(priority)}`}
              >
                {priorityLabel(priority)} priority
              </span>
              {pharmacy.listed && (
                <span className="rounded-full border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-200">
                  Listed
                </span>
              )}
              {pharmacy.featured && (
                <span className="rounded-full border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-amber-200">
                  Featured
                </span>
              )}
            </div>
            <h1
              className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {pharmacy.name}
            </h1>
            <p className="mt-2 text-sm text-teal-100/70">
              /p/{pharmacy.slug}
              {pharmacy.legalName ? ` · ${pharmacy.legalName}` : ""}
              {age != null ? ` · ${age === 0 ? "submitted today" : `${age}d in queue`}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/p/${pharmacy.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/20 px-3 text-xs font-semibold text-teal-50 hover:bg-white/5"
            >
              Storefront <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <form action={impersonatePharmacyAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="pharmacyId" value={pharmacy.id} />
              <input
                name="reason"
                required
                placeholder="Support reason"
                className="h-10 min-w-[12rem] rounded-xl border border-white/20 bg-black/30 px-3 text-xs text-white outline-none"
              />
              <input
                name="ticketRef"
                placeholder="Ticket #"
                className="h-10 w-28 rounded-xl border border-white/20 bg-black/30 px-3 text-xs text-white outline-none"
              />
              <select
                name="mode"
                className="h-10 rounded-xl border border-white/20 bg-black/30 px-2 text-xs text-white"
                defaultValue="read_only"
              >
                <option value="read_only">Read only</option>
                <option value="act_as_tenant">Act as tenant</option>
              </select>
              <button
                type="submit"
                className="inline-flex min-h-10 items-center rounded-xl border border-white/20 px-3 text-xs font-semibold text-teal-50 hover:bg-white/5"
              >
                Open admin (support)
              </button>
            </form>
          </div>
        </div>

        {/* Verification readiness */}
        <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {checks.map((c) => (
            <li
              key={c.label}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                c.ok
                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-100"
              }`}
            >
              <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${c.ok ? "opacity-100" : "opacity-40"}`} />
              {c.label}
              <span className="ml-auto text-[10px] uppercase opacity-80">{c.ok ? "OK" : "Missing"}</span>
            </li>
          ))}
        </ul>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          {/* Decision — primary action */}
          <section className="rounded-2xl border border-white/12 bg-white/[0.04] p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-100/70">
              Verification decision
            </h2>
            <p className="mt-1 text-xs text-teal-100/55">
              Approve, request info, or reject. The owner gets an email when the status changes.
            </p>
            <div className="mt-4">
              <ReviewDecisionForm pharmacyId={pharmacy.id} currentStatus={pharmacy.status} />
            </div>
          </section>

          {/* Identity summary */}
          <section className="rounded-2xl border border-white/12 bg-white/[0.04] p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-100/70">
              Application snapshot
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-teal-100/50">
                  Licence
                </dt>
                <dd className="mt-1 text-sm font-medium">{pharmacy.licenseNumber || "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-teal-100/50">
                  Location
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {[pharmacy.city, pharmacy.county].filter(Boolean).join(", ") || "—"}
                </dd>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="mt-0.5 h-3.5 w-3.5 text-teal-200/60" />
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-teal-100/50">
                    Phone
                  </dt>
                  <dd className="mt-1 text-sm">{pharmacy.phone || "—"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 h-3.5 w-3.5 text-teal-200/60" />
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-teal-100/50">
                    Email
                  </dt>
                  <dd className="mt-1 break-all text-sm">
                    {pharmacy.email || pharmacy.owner?.email || "—"}
                  </dd>
                </div>
              </div>
            </dl>

            {mapEmbed ? (
              <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
                <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-xs text-teal-100/70">
                  <MapPin className="h-3.5 w-3.5" />
                  Premises pin ({pharmacy.latitude}, {pharmacy.longitude})
                </div>
                <iframe
                  title="Pharmacy pin"
                  src={mapEmbed}
                  className="h-48 w-full border-0"
                  loading="lazy"
                />
              </div>
            ) : (
              <p className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-xs text-amber-100">
                No map pin on this application — confirm location with the owner before approving if required.
              </p>
            )}
          </section>

          {/* Edit tenant */}
          <form
            action={updatePharmacyAction}
            className="rounded-2xl border border-white/12 bg-white/[0.04] p-5 sm:p-6"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-100/70">
              Edit tenant details
            </h2>
            <input type="hidden" name="pharmacyId" value={pharmacy.id} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                Display name
                <input name="name" defaultValue={pharmacy.name} required className={inputCls} />
              </label>
              <label className="block text-sm">
                Storefront slug (/p/…)
                <input
                  name="slug"
                  defaultValue={pharmacy.slug}
                  required
                  pattern="[a-z0-9][a-z0-9-]{1,60}"
                  className={inputCls}
                />
              </label>
              <label className="block text-sm">
                Legal name
                <input name="legalName" defaultValue={pharmacy.legalName ?? ""} className={inputCls} />
              </label>
              <label className="block text-sm">
                PPB / premises licence
                <input
                  name="licenseNumber"
                  defaultValue={pharmacy.licenseNumber ?? ""}
                  className={inputCls}
                />
              </label>
              <label className="block text-sm">
                Phone
                <input name="phone" type="tel" defaultValue={pharmacy.phone ?? ""} className={inputCls} />
              </label>
              <label className="block text-sm">
                WhatsApp
                <input
                  name="whatsapp"
                  type="tel"
                  defaultValue={pharmacy.whatsapp ?? ""}
                  className={inputCls}
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                Email
                <input name="email" type="email" defaultValue={pharmacy.email ?? ""} className={inputCls} />
              </label>
              <label className="block text-sm">
                City
                <input name="city" defaultValue={pharmacy.city ?? ""} className={inputCls} />
              </label>
              <label className="block text-sm">
                County
                <input name="county" defaultValue={pharmacy.county ?? ""} className={inputCls} />
              </label>
            </div>
            <button
              type="submit"
              className="mt-4 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#071512] hover:bg-teal-100"
            >
              Save tenant details
            </button>
          </form>

          {/* Listing + suspend */}
          <div className="grid gap-4 sm:grid-cols-2">
            <form
              action={setPharmacyLiveAction}
              className="rounded-2xl border border-white/12 bg-white/[0.04] p-5"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-100/70">
                Marketplace flags
              </h2>
              <input type="hidden" name="pharmacyId" value={pharmacy.id} />
              <div className="mt-3 space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="listed" value="true" defaultChecked={pharmacy.listed} />
                  Listed on marketplace
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="featured"
                    value="true"
                    defaultChecked={pharmacy.featured}
                  />
                  Featured
                </label>
              </div>
              <button
                type="submit"
                className="mt-4 rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-white/10"
              >
                Save flags
              </button>
            </form>

            <form
              action={setPharmacyLiveAction}
              className="rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-5"
            >
              <input type="hidden" name="pharmacyId" value={pharmacy.id} />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-100/80">
                Restore
              </h2>
              <p className="mt-1 text-xs text-teal-100/60">
                Set active and list after a suspension or pre-launch approval.
              </p>
              <button
                type="submit"
                name="restore"
                value="true"
                className="mt-4 rounded-xl border border-emerald-400/40 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-400/15"
              >
                Restore &amp; list
              </button>
            </form>
          </div>

          <form
            action={suspendPharmacyAction}
            className="rounded-2xl border border-rose-400/30 bg-rose-500/5 p-5"
          >
            <input type="hidden" name="pharmacyId" value={pharmacy.id} />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-rose-100/90">
              Suspend tenant
            </h2>
            <p className="mt-1 text-xs text-teal-100/60">
              Unlists the storefront and blocks staff access. Reason is written to the timeline.
            </p>
            <label className="mt-3 block text-sm">
              Reason
              <input
                name="reason"
                required
                placeholder="e.g. Licence expired — pending PPB renewal"
                className={inputCls}
              />
            </label>
            <button
              type="submit"
              className="mt-3 rounded-xl border border-rose-400/50 px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-400/15"
            >
              Suspend pharmacy
            </button>
          </form>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-white/12 bg-white/[0.04] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-100/70">Staff</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {pharmacy.memberships.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2.5"
                >
                  <span className="min-w-0 truncate">{m.user.email}</span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-teal-100/50">
                    {m.role}
                  </span>
                </li>
              ))}
              {pharmacy.memberships.length === 0 && (
                <li className="text-xs text-teal-100/50">No staff memberships.</li>
              )}
            </ul>
            {pharmacy.owner && (
              <a
                href={`mailto:${pharmacy.owner.email}`}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-200 hover:underline"
              >
                <Mail className="h-3.5 w-3.5" />
                Email owner
              </a>
            )}
          </section>

          <section className="rounded-2xl border border-white/12 bg-white/[0.04] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-100/70">
              Onboarding timeline
            </h2>
            <ul className="mt-4 space-y-4">
              {pharmacy.onboardingEvents.map((e) => (
                <li key={e.id} className="relative border-l-2 border-white/15 pl-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-100/50">
                    {e.type.replace(/_/g, " ")} ·{" "}
                    {new Date(e.createdAt).toLocaleString("en-KE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-teal-50/90">{e.message}</p>
                </li>
              ))}
              {pharmacy.onboardingEvents.length === 0 && (
                <li className="text-xs text-teal-100/50">No events yet.</li>
              )}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
