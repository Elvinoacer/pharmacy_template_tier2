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
import { ArrowLeft, CalendarCheck, Banknote, CheckCircle2 } from "lucide-react";

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
      subtitle="Requests from the public service forms — confirm, record payment, complete"
      actions={
        <Link
          href="/admin/services"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-3 py-1.5 text-xs font-semibold admin-accent-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Services
        </Link>
      }
    >
      {loadError && (
        <div className="admin-alert-error mb-4">
          <span>{loadError}</span>
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <AdminCard label="Shown" value={rows.length} icon={CalendarCheck} accent="neutral" />
        <AdminCard
          label="Awaiting payment"
          value={awaiting}
          hint="Priced bookings not yet paid"
          icon={Banknote}
          accent="info"
        />
        <AdminCard
          label="Confirmed"
          value={confirmed}
          icon={CheckCircle2}
          accent="accent"
        />
      </div>

      <AdminPanel
        title="Bookings"
        description="Priced services stay awaiting payment until M-Pesa succeeds or you record cash at the counter."
      >
        <ServiceBookingsPanel bookings={rows} statusFilter={statusFilter} />
      </AdminPanel>
    </AdminShell>
  );
}
