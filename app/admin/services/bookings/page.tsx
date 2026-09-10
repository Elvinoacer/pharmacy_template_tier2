import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { listAdminBookings } from "@/app/lib/services/pharmacy-services";
import { AdminPanel, AdminCard } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import {
  ServiceBookingsPanel,
  type BookingRow,
} from "@/app/components/admin/ServiceBookingsPanel";
import { ArrowLeft, CalendarCheck, Banknote, CheckCircle2, Sparkles } from "lucide-react";

export const metadata = { title: "Service bookings" };

export default async function AdminServiceBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const statusFilter = sp.status || "all";

  let bookings: Awaited<ReturnType<typeof listAdminBookings>> = [];
  let loadError: string | null = null;
  try {
    bookings = await listAdminBookings({ status: statusFilter, take: 150 });
  } catch (err) {
    console.error("[admin/services/bookings]", err);
    loadError = "Could not load bookings. Run migrations if needed.";
  }

  const rows: BookingRow[] = bookings.map((b) => ({
    id: b.id,
    fullName: b.fullName,
    phone: b.phone,
    email: b.email,
    notes: b.notes,
    preferredDate: b.preferredDate,
    preferredTime: b.preferredTime,
    status: b.status,
    paymentStatus: b.paymentStatus,
    amount: b.amount == null ? null : Number(b.amount.toString()),
    orderId: b.orderId,
    paidVia: b.paidVia,
    paymentRef: b.paymentRef,
    staffNotes: b.staffNotes,
    createdAt: b.createdAt.toISOString(),
    service: b.service,
  }));

  const awaiting = rows.filter((r) => r.status === "awaiting_payment").length;
  const confirmed = rows.filter((r) => r.status === "confirmed").length;

  return (
    <AdminShell
      user={user}
      title="Service bookings"
      subtitle="Review requests, settle payment, and move appointments through the queue without losing context on mobile."
      actions={
        <Link
          href="/admin/services"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-1.5 text-xs font-semibold admin-accent-text transition hover:border-[var(--admin-border-2)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Services
        </Link>
      }
    >
      <div className="bookings-ux space-y-4 sm:space-y-6">
        {loadError && (
          <div className="admin-alert-error">
            <span>{loadError}</span>
          </div>
        )}

        <section aria-label="Booking queue summary" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          <AdminCard label="Shown" value={rows.length} hint="Current filter" icon={CalendarCheck} accent="neutral" />
          <AdminCard label="Awaiting payment" value={awaiting} hint="Needs payment action" icon={Banknote} accent={awaiting > 0 ? "info" : "neutral"} />
          <div className="col-span-2 sm:col-span-1">
            <AdminCard label="Confirmed" value={confirmed} hint="Ready for service" icon={CheckCircle2} accent="accent" />
          </div>
        </section>

        <div className="flex items-start gap-2.5 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-accent-soft)] px-3.5 py-3 text-xs leading-5 admin-muted sm:px-4">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 admin-accent-text" />
          <p><strong className="admin-text">Queue priority:</strong> clear awaiting-payment bookings first, then work confirmed appointments. On phones, customer context stays above full-width payment and status controls.</p>
        </div>

        <AdminPanel title="Bookings queue" description="Priced services stay awaiting payment until M-Pesa succeeds or staff records an approved counter payment." className="!p-3 sm:!p-5">
          <ServiceBookingsPanel bookings={rows} statusFilter={statusFilter} />
        </AdminPanel>

        <style>{`
          .bookings-ux .space-y-4 > div:first-child.flex { flex-wrap: nowrap; overflow-x: auto; padding-bottom: .25rem; overscroll-behavior-x: contain; scrollbar-width: thin; }
          .bookings-ux .space-y-4 > div:first-child.flex > a { flex: 0 0 auto; min-height: 38px; display: inline-flex; align-items: center; }
          .bookings-ux li { transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease; }
          @media (hover: hover) { .bookings-ux li:hover { transform: translateY(-1px); border-color: var(--admin-border-2); box-shadow: 0 10px 24px color-mix(in srgb, var(--admin-text) 7%, transparent); } }
          @media (max-width: 639px) {
            .bookings-ux li { border-radius: 16px !important; padding: 14px !important; }
            .bookings-ux li > div { flex-direction: column; align-items: stretch; }
            .bookings-ux li > div > div { width: 100%; }
            .bookings-ux li > div > div:last-child { padding-top: 12px; border-top: 1px solid var(--admin-border); }
            .bookings-ux li form { width: 100%; }
            .bookings-ux li form.flex { display: grid; grid-template-columns: minmax(0, 1fr); align-items: stretch; }
            .bookings-ux li form > div, .bookings-ux li form input:not([type="hidden"]), .bookings-ux li form select, .bookings-ux li form button { width: 100%; }
            .bookings-ux li form button { min-height: 44px; justify-content: center; }
            .bookings-ux li > div > div:last-child > div.flex { display: grid; grid-template-columns: minmax(0, 1fr); width: 100%; gap: 8px; }
          }
          html[data-theme="dark"] .bookings-ux [class*="text-amber-700"] { color: #fbbf24 !important; }
          html[data-theme="dark"] .bookings-ux [class*="text-emerald-700"] { color: #6ee7b7 !important; }
          html[data-theme="dark"] .bookings-ux [class*="text-sky-700"] { color: #7dd3fc !important; }
          html[data-theme="dark"] .bookings-ux [class*="text-red-700"] { color: #fda4af !important; }
          html[data-theme="dark"] .bookings-ux [class*="text-violet-700"] { color: #c4b5fd !important; }
          @media (prefers-reduced-motion: reduce) { .bookings-ux li { transition: none; } .bookings-ux li:hover { transform: none; } }
        `}</style>
      </div>
    </AdminShell>
  );
}
