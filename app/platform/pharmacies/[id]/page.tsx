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
  "mt-1.5 min-h-11 w-full rounded-xl border border-[#cfdcd4] bg-white px-3 py-2.5 text-sm text-[#17231d] outline-none transition placeholder:text-[#8c9891] focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 dark:border-white/15 dark:bg-black/25 dark:text-white dark:placeholder:text-teal-100/35 dark:focus:border-teal-300/50 dark:focus:ring-teal-300/10";

const cardCls =
  "rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none sm:p-5";

const eyebrowCls =
  "text-[10px] font-semibold uppercase tracking-[0.15em] text-[#718078] dark:text-teal-100/55";

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
  const readyCount = checks.filter((check) => check.ok).length;

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <Link
        href="/platform/applications"
        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg text-xs font-semibold text-teal-700 transition hover:text-teal-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-200/85 dark:hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to verification queue
      </Link>

      <header className="overflow-hidden rounded-3xl border border-[#dce7e1] bg-gradient-to-br from-white via-white to-teal-50/70 shadow-sm dark:border-white/10 dark:from-white/[0.06] dark:via-white/[0.035] dark:to-teal-400/[0.03] dark:shadow-none">
        <div className="p-4 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusBadgeClass(pharmacy.status)}`}
                >
                  {formatStatus(pharmacy.status)}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${priorityBadgeClass(priority)}`}
                >
                  {priorityLabel(priority)} priority
                </span>
                {pharmacy.listed ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
                    Listed
                  </span>
                ) : null}
                {pharmacy.featured ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
                    Featured
                  </span>
                ) : null}
              </div>

              <h1
                className="mt-3 break-words text-2xl font-semibold tracking-tight text-[#14211b] dark:text-white sm:text-4xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {pharmacy.name}
              </h1>
              <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-[#68776e] dark:text-teal-100/65">
                /p/{pharmacy.slug}
                {pharmacy.legalName ? ` · ${pharmacy.legalName}` : ""}
                {age != null ? ` · ${age === 0 ? "submitted today" : `${age}d in queue`}` : ""}
              </p>
            </div>

            <Link
              href={`/p/${pharmacy.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#cfdcd4] bg-white px-3 text-xs font-semibold text-[#304139] shadow-sm transition hover:border-teal-300 hover:text-teal-800 active:scale-[0.98] dark:border-white/20 dark:bg-white/5 dark:text-teal-50 dark:shadow-none dark:hover:bg-white/10 sm:w-auto"
            >
              Open storefront <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#e5ece7] pt-4 dark:border-white/10">
            <div>
              <p className={eyebrowCls}>Verification readiness</p>
              <p className="mt-1 text-sm font-medium text-[#304139] dark:text-teal-50/90">
                {readyCount} of {checks.length} essentials present
              </p>
            </div>
            <span className="text-2xl font-semibold tabular-nums text-teal-700 dark:text-teal-200">
              {Math.round((readyCount / checks.length) * 100)}%
            </span>
          </div>

          <ul className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-5">
            {checks.map((check) => (
              <li
                key={check.label}
                className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                  check.ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100"
                    : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"
                }`}
              >
                <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${check.ok ? "opacity-100" : "opacity-45"}`} />
                <span className="min-w-0 flex-1 truncate">{check.label}</span>
                <span className="text-[9px] font-semibold uppercase opacity-80">
                  {check.ok ? "OK" : "Missing"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:gap-6">
        <div className="min-w-0 space-y-5 sm:space-y-6">
          <section className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 shadow-sm dark:border-teal-300/15 dark:bg-teal-300/[0.045] dark:shadow-none sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-teal-700 dark:text-teal-200/70">
                  Primary action
                </p>
                <h2 className="mt-1 text-base font-semibold text-[#17231d] dark:text-white">Verification decision</h2>
              </div>
              <span className="text-xs text-[#6a786f] dark:text-teal-100/55">Owner is notified on change</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#627168] dark:text-teal-100/60">
              Approve, request information, reject, or move the application into active review.
            </p>
            <div className="mt-4">
              <ReviewDecisionForm pharmacyId={pharmacy.id} currentStatus={pharmacy.status} />
            </div>
          </section>

          <section className={cardCls}>
            <p className={eyebrowCls}>Application snapshot</p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-[#f7faf8] p-3 dark:bg-white/[0.03]">
                <dt className={eyebrowCls}>Licence</dt>
                <dd className="mt-1 break-words text-sm font-semibold text-[#26352d] dark:text-teal-50/95">
                  {pharmacy.licenseNumber || "—"}
                </dd>
              </div>
              <div className="rounded-xl bg-[#f7faf8] p-3 dark:bg-white/[0.03]">
                <dt className={eyebrowCls}>Location</dt>
                <dd className="mt-1 break-words text-sm font-semibold text-[#26352d] dark:text-teal-50/95">
                  {[pharmacy.city, pharmacy.county].filter(Boolean).join(", ") || "—"}
                </dd>
              </div>
              <div className="flex min-w-0 items-start gap-2 rounded-xl bg-[#f7faf8] p-3 dark:bg-white/[0.03]">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-200/60" />
                <div className="min-w-0">
                  <dt className={eyebrowCls}>Phone</dt>
                  <dd className="mt-1 break-words text-sm text-[#304139] dark:text-teal-50/90">
                    {pharmacy.phone || "—"}
                  </dd>
                </div>
              </div>
              <div className="flex min-w-0 items-start gap-2 rounded-xl bg-[#f7faf8] p-3 dark:bg-white/[0.03]">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-200/60" />
                <div className="min-w-0">
                  <dt className={eyebrowCls}>Email</dt>
                  <dd className="mt-1 break-all text-sm text-[#304139] dark:text-teal-50/90">
                    {pharmacy.email || pharmacy.owner?.email || "—"}
                  </dd>
                </div>
              </div>
            </dl>

            {mapEmbed ? (
              <div className="mt-5 overflow-hidden rounded-xl border border-[#dce7e1] dark:border-white/10">
                <div className="flex items-center gap-2 border-b border-[#dce7e1] bg-[#f7faf8] px-3 py-2 text-xs text-[#617067] dark:border-white/10 dark:bg-white/[0.03] dark:text-teal-100/65">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Premises pin ({pharmacy.latitude}, {pharmacy.longitude})</span>
                </div>
                <iframe
                  title="Pharmacy pin"
                  src={mapEmbed}
                  className="h-52 w-full border-0 sm:h-60"
                  loading="lazy"
                />
              </div>
            ) : (
              <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
                No map pin on this application — confirm location with the owner before approving if required.
              </p>
            )}
          </section>

          <form action={updatePharmacyAction} className={cardCls}>
            <div>
              <p className={eyebrowCls}>Tenant record</p>
              <h2 className="mt-1 text-base font-semibold text-[#17231d] dark:text-white">Edit tenant details</h2>
              <p className="mt-1 text-xs leading-5 text-[#718078] dark:text-teal-100/55">
                Keep public identity and contact details accurate without leaving the review workflow.
              </p>
            </div>
            <input type="hidden" name="pharmacyId" value={pharmacy.id} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
                Display name
                <input name="name" defaultValue={pharmacy.name} required className={inputCls} />
              </label>
              <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
                Storefront slug (/p/…)
                <input
                  name="slug"
                  defaultValue={pharmacy.slug}
                  required
                  pattern="[a-z0-9][a-z0-9-]{1,60}"
                  className={inputCls}
                />
              </label>
              <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
                Legal name
                <input name="legalName" defaultValue={pharmacy.legalName ?? ""} className={inputCls} />
              </label>
              <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
                PPB / premises licence
                <input
                  name="licenseNumber"
                  defaultValue={pharmacy.licenseNumber ?? ""}
                  className={inputCls}
                />
              </label>
              <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
                Phone
                <input name="phone" type="tel" defaultValue={pharmacy.phone ?? ""} className={inputCls} />
              </label>
              <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
                WhatsApp
                <input
                  name="whatsapp"
                  type="tel"
                  defaultValue={pharmacy.whatsapp ?? ""}
                  className={inputCls}
                />
              </label>
              <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90 sm:col-span-2">
                Email
                <input name="email" type="email" defaultValue={pharmacy.email ?? ""} className={inputCls} />
              </label>
              <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
                City
                <input name="city" defaultValue={pharmacy.city ?? ""} className={inputCls} />
              </label>
              <label className="block text-sm font-medium text-[#304139] dark:text-teal-50/90">
                County
                <input name="county" defaultValue={pharmacy.county ?? ""} className={inputCls} />
              </label>
            </div>
            <button
              type="submit"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 active:scale-[0.98] dark:bg-teal-300 dark:text-teal-950 dark:hover:bg-teal-200 sm:w-auto"
            >
              Save tenant details
            </button>
          </form>

          <section>
            <div className="mb-3">
              <p className={eyebrowCls}>Lifecycle controls</p>
              <h2 className="mt-1 text-base font-semibold text-[#17231d] dark:text-white">Marketplace & access</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <form action={setPharmacyLiveAction} className={cardCls}>
                <h3 className="text-sm font-semibold text-[#17231d] dark:text-white">Marketplace flags</h3>
                <input type="hidden" name="pharmacyId" value={pharmacy.id} />
                <div className="mt-3 space-y-1 text-sm text-[#304139] dark:text-teal-50/90">
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-1">
                    <input
                      type="checkbox"
                      name="listed"
                      value="true"
                      defaultChecked={pharmacy.listed}
                      className="h-4 w-4 accent-teal-700"
                    />
                    Listed on marketplace
                  </label>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-1">
                    <input
                      type="checkbox"
                      name="featured"
                      value="true"
                      defaultChecked={pharmacy.featured}
                      className="h-4 w-4 accent-teal-700"
                    />
                    Featured
                  </label>
                </div>
                <button
                  type="submit"
                  className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[#cfdcd4] bg-[#f7faf8] px-3 text-xs font-semibold text-[#304139] transition hover:bg-teal-50 active:scale-[0.98] dark:border-white/20 dark:bg-white/5 dark:text-teal-50 dark:hover:bg-white/10 sm:w-auto"
                >
                  Save flags
                </button>
              </form>

              <form
                action={setPharmacyLiveAction}
                className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm dark:border-emerald-400/25 dark:bg-emerald-400/5 dark:shadow-none sm:p-5"
              >
                <input type="hidden" name="pharmacyId" value={pharmacy.id} />
                <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Restore tenant</h3>
                <p className="mt-1 text-xs leading-5 text-emerald-800/80 dark:text-teal-100/60">
                  Set active and list after a suspension or pre-launch approval.
                </p>
                <button
                  type="submit"
                  name="restore"
                  value="true"
                  className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-emerald-300 bg-white/70 px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 active:scale-[0.98] dark:border-emerald-400/40 dark:bg-transparent dark:text-emerald-100 dark:hover:bg-emerald-400/15 sm:w-auto"
                >
                  Restore &amp; list
                </button>
              </form>
            </div>

            <form
              action={suspendPharmacyAction}
              className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm dark:border-rose-400/30 dark:bg-rose-500/5 dark:shadow-none sm:p-5"
            >
              <input type="hidden" name="pharmacyId" value={pharmacy.id} />
              <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-100">Suspend tenant</h3>
              <p className="mt-1 text-xs leading-5 text-rose-800/80 dark:text-teal-100/60">
                Unlists the storefront and blocks staff access. The reason is written to the timeline.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="min-w-0 flex-1 text-sm font-medium text-rose-900 dark:text-rose-50">
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
                  className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-800 transition hover:bg-rose-100 active:scale-[0.98] dark:border-rose-400/50 dark:bg-transparent dark:text-rose-100 dark:hover:bg-rose-400/15 sm:w-auto"
                >
                  Suspend pharmacy
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="min-w-0 space-y-5 sm:space-y-6">
          <section className={cardCls}>
            <p className={eyebrowCls}>Support access</p>
            <h2 className="mt-1 text-base font-semibold text-[#17231d] dark:text-white">Open tenant admin</h2>
            <p className="mt-1 text-xs leading-5 text-[#718078] dark:text-teal-100/55">
              Keep support access auditable by recording a reason and optional ticket reference.
            </p>
            <form action={impersonatePharmacyAction} className="mt-4 grid gap-3">
              <input type="hidden" name="pharmacyId" value={pharmacy.id} />
              <label className="text-sm font-medium text-[#304139] dark:text-teal-50/90">
                Support reason
                <input name="reason" required placeholder="What are you helping with?" className={inputCls} />
              </label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <label className="text-sm font-medium text-[#304139] dark:text-teal-50/90">
                  Ticket reference
                  <input name="ticketRef" placeholder="Ticket #" className={inputCls} />
                </label>
                <label className="text-sm font-medium text-[#304139] dark:text-teal-50/90">
                  Access mode
                  <select name="mode" className={inputCls} defaultValue="read_only">
                    <option value="read_only">Read only</option>
                    <option value="act_as_tenant">Act as tenant</option>
                  </select>
                </label>
              </div>
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#26352d] px-4 text-sm font-semibold text-white transition hover:bg-[#17231d] active:scale-[0.98] dark:bg-white dark:text-[#071512] dark:hover:bg-teal-100"
              >
                Open admin support session
              </button>
            </form>
          </section>

          <section className={cardCls}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={eyebrowCls}>People</p>
                <h2 className="mt-1 text-base font-semibold text-[#17231d] dark:text-white">Staff</h2>
              </div>
              <span className="rounded-full bg-[#f3f7f4] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#56665d] dark:bg-white/5 dark:text-teal-100/65">
                {pharmacy.memberships.length}
              </span>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {pharmacy.memberships.map((membership) => (
                <li
                  key={membership.id}
                  className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-[#e4ece7] bg-[#fbfdfb] px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.025]"
                >
                  <span className="min-w-0 flex-1 truncate text-[#304139] dark:text-teal-50/90">
                    {membership.user.email}
                  </span>
                  <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-[#77857c] dark:text-teal-100/50">
                    {membership.role}
                  </span>
                </li>
              ))}
              {pharmacy.memberships.length === 0 ? (
                <li className="rounded-xl border border-dashed border-[#dce7e1] px-3 py-5 text-center text-xs text-[#7c8981] dark:border-white/10 dark:text-teal-100/45">
                  No staff memberships.
                </li>
              ) : null}
            </ul>
            {pharmacy.owner ? (
              <a
                href={`mailto:${pharmacy.owner.email}`}
                className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg text-xs font-semibold text-teal-700 underline-offset-4 hover:underline dark:text-teal-200"
              >
                <Mail className="h-3.5 w-3.5" />
                Email owner
              </a>
            ) : null}
          </section>

          <section className={cardCls}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={eyebrowCls}>Audit trail</p>
                <h2 className="mt-1 text-base font-semibold text-[#17231d] dark:text-white">Onboarding timeline</h2>
              </div>
              <span className="rounded-full bg-[#f3f7f4] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#56665d] dark:bg-white/5 dark:text-teal-100/65">
                {pharmacy.onboardingEvents.length}
              </span>
            </div>
            <ul className="mt-4 space-y-4">
              {pharmacy.onboardingEvents.map((event) => (
                <li
                  key={event.id}
                  className="relative border-l-2 border-[#dce7e1] pl-4 dark:border-white/15"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-[#7a8880] dark:text-teal-100/45">
                    {event.type.replace(/_/g, " ")} ·{" "}
                    {new Date(event.createdAt).toLocaleString("en-KE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <p className="mt-1 break-words text-sm leading-6 text-[#405047] dark:text-teal-50/85">
                    {event.message}
                  </p>
                </li>
              ))}
              {pharmacy.onboardingEvents.length === 0 ? (
                <li className="text-xs text-[#7c8981] dark:text-teal-100/45">No events yet.</li>
              ) : null}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
