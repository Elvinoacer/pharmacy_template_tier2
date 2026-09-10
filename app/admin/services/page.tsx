import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { listAdminServices } from "@/app/lib/services/pharmacy-services";
import { AdminPanel, AdminCard } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import {
  ServiceManager,
  type ServiceRow,
} from "@/app/components/admin/ServiceManager";
import { CalendarCheck, Sparkles, Banknote, Eye } from "lucide-react";

export const metadata = { title: "Pharmacy services" };

export default async function AdminServicesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  let services: Awaited<ReturnType<typeof listAdminServices>> = [];
  let loadError: string | null = null;
  try {
    services = await listAdminServices();
  } catch (err) {
    console.error("[admin/services]", err);
    loadError =
      "Could not load services. Run `npm run db:migrate` if this is a fresh deploy.";
  }

  const rows: ServiceRow[] = services.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    short: s.short,
    description: s.description,
    benefits: s.benefits,
    eligibility: s.eligibility,
    duration: s.duration,
    imageUrl: s.imageUrl,
    icon: s.icon,
    price: s.price == null ? null : Number(s.price.toString()),
    bookable: s.bookable,
    active: s.active,
    sortOrder: s.sortOrder,
    bookingCount: s._count.bookings,
  }));

  const active = rows.filter((r) => r.active).length;
  const priced = rows.filter((r) => r.price != null).length;
  const bookings = rows.reduce((n, r) => n + r.bookingCount, 0);

  return (
    <AdminShell
      user={user}
      title="Pharmacy services"
      subtitle="Keep the service catalogue operational: availability, pricing, visibility, and bookings in one workspace."
      actions={
        <Link
          href="/admin/services/bookings"
          className="btn-admin-secondary inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold sm:w-auto"
        >
          <CalendarCheck className="h-3.5 w-3.5" /> Review bookings
        </Link>
      }
    >
      {loadError && (
        <div className="admin-alert-error mb-4">
          <span>{loadError}</span>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminCard label="Services" value={rows.length} hint={`${active} active`} icon={Sparkles} accent="accent" />
        <AdminCard label="Priced" value={priced} hint="Payment required" icon={Banknote} accent="info" />
        <AdminCard label="Bookings" value={bookings} hint="All recorded" icon={CalendarCheck} accent="neutral" />
        <AdminCard label="Public" value={active} hint="Visible online" icon={Eye} accent="accent" />
      </div>

      <AdminPanel
        title="Service catalogue"
        description="Search first, then edit visibility, booking rules, price, and public service details."
      >
        <ServiceManager initial={rows} />
      </AdminPanel>
    </AdminShell>
  );
}
