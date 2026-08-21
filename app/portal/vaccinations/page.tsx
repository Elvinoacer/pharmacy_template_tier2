import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { PortalVaccinationsView } from "@/app/components/portal/PortalVaccinationsView";
import { listCustomerVaccinationPortal } from "@/app/lib/services/vaccination-service";
import Link from "next/link";
import { Syringe } from "lucide-react";

export const metadata = { title: "My vaccinations" };
export const dynamic = "force-dynamic";

export default async function PortalVaccinationsPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();

  const data = await listCustomerVaccinationPortal(user.customerId).catch(() => ({
    appointments: [],
    records: [],
    counselling: [],
  }));

  return (
    <PortalShell
      user={user}
      title="Vaccinations & prevention"
      subtitle="Your digital immunisation card, upcoming bookings, and preventive counselling sessions."
      actions={
        <Link href="/vaccinations/book" className="btn-primary">
          <Syringe className="h-4 w-4" /> Book a vaccine
        </Link>
      }
    >
      <PortalVaccinationsView
        records={data.records.map((r) => ({
          id: r.id,
          certificateCode: r.certificateCode,
          patientName: r.patientName,
          doseNumber: r.doseNumber,
          seriesComplete: r.seriesComplete,
          administeredAt: r.administeredAt.toISOString(),
          lotNumber: r.lotNumber,
          site: r.site,
          route: r.route,
          nextDueDate: r.nextDueDate ? r.nextDueDate.toISOString() : null,
          observationOutcome: r.observationOutcome,
          vaccine: r.vaccine,
        }))}
        appointments={data.appointments.map((a) => ({
          id: a.id,
          status: a.status,
          preferredDate: a.preferredDate,
          preferredTime: a.preferredTime,
          createdAt: a.createdAt.toISOString(),
          vaccine: a.vaccine,
          screening: a.screening ? { outcome: a.screening.outcome } : null,
        }))}
        counselling={data.counselling.map((c) => ({
          id: c.id,
          topic: c.topic,
          status: c.status,
          preferredDate: c.preferredDate,
          summary: c.summary,
          createdAt: c.createdAt.toISOString(),
        }))}
      />
    </PortalShell>
  );
}
