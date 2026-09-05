import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { AdminCard } from "@/app/components/admin/AdminUI";
import { AdminVaccinationCenter } from "@/app/components/admin/AdminVaccinationCenter";
import {
  listAdminAppointments,
  listImmunizationRecords,
  listAefiReports,
  listCounsellingSessionsAdmin,
  listPublicHealthCampaigns,
  listImmunizerCredentials,
  getImmunizationPolicy,
  listPublicVaccines,
} from "@/app/lib/services/vaccination-service";
import { Syringe, AlertTriangle, CalendarCheck, ShieldCheck } from "lucide-react";

export const metadata = { title: "Vaccination & Preventive Services | Admin" };
export const dynamic = "force-dynamic";

export default async function AdminVaccinationsPage() {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) redirect("/login");

  const [
    appointments,
    records,
    aefi,
    counselling,
    campaigns,
    credentials,
    policy,
    vaccines,
    customers,
    staff,
  ] = await Promise.all([
    listAdminAppointments({ take: 150 }).catch(() => []),
    listImmunizationRecords({ take: 150 }).catch(() => []),
    listAefiReports(80).catch(() => []),
    listCounsellingSessionsAdmin({ take: 80 }).catch(() => []),
    listPublicHealthCampaigns({ activeOnly: false }).catch(() => []),
    listImmunizerCredentials().catch(() => []),
    getImmunizationPolicy(),
    listPublicVaccines().catch(() => []),
    prisma.customerProfile
      .findMany({ select: { id: true, fullName: true, phone: true }, orderBy: { fullName: "asc" }, take: 200 })
      .catch(() => []),
    prisma.user
      .findMany({
        where: { role: { in: ["staff", "pharmacist", "manager"] } },
        select: { id: true, email: true, role: true },
        take: 50,
      })
      .catch(() => []),
  ]);

  const openQueue = appointments.filter((a) =>
    ["requested", "screened", "scheduled", "checked_in"].includes(a.status),
  ).length;
  const aefiOpen = aefi.filter((r) => r.severity === "severe" || r.severity === "life_threatening").length;

  return (
    <AdminShell
      user={user}
      title="Vaccination clinic"
      subtitle="Manage clinic requests, record vaccinations, and review follow-up information."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <AdminCard label="Open clinic queue" value={openQueue} hint="Requested / screened / scheduled" icon={CalendarCheck} accent="info" />
        <AdminCard label="Doses on record" value={records.length} hint="Administered certificates" icon={Syringe} accent="accent" />
        <AdminCard label="Serious AEFI" value={aefiOpen} hint="Severe or life-threatening" icon={AlertTriangle} accent="danger" />
        <AdminCard
          label="Programme"
          value={policy.enabled ? "Enabled" : "Off"}
          hint={policy.jurisdiction}
          icon={ShieldCheck}
          accent={policy.enabled ? "accent" : "neutral"}
        />
      </div>
      <AdminVaccinationCenter
        vaccines={vaccines.map((v) => ({
          id: v.id,
          slug: v.slug,
          name: v.name,
          antigen: v.antigen,
          route: v.route,
          siteOptions: v.siteOptions,
          doseMl: v.doseMl != null ? Number(v.doseMl) : null,
          visVersion: v.visVersion,
          pharmacyAdministered: v.pharmacyAdministered,
          priceKes: v.priceKes != null ? Number(v.priceKes) : null,
        }))}
        appointments={appointments.map((a) => ({
          id: a.id,
          status: a.status,
          source: a.source,
          patientName: a.patientName,
          patientPhone: a.patientPhone,
          patientEmail: a.patientEmail,
          patientDob: a.patientDob ? a.patientDob.toISOString() : null,
          preferredDate: a.preferredDate,
          preferredTime: a.preferredTime,
          createdAt: a.createdAt.toISOString(),
          notes: a.notes,
          staffNotes: a.staffNotes,
          vaccine: {
            id: a.vaccine.id,
            slug: a.vaccine.slug,
            name: a.vaccine.name,
            route: a.vaccine.route,
            siteOptions: a.vaccine.siteOptions,
            doseMl: a.vaccine.doseMl != null ? Number(a.vaccine.doseMl) : null,
            visVersion: a.vaccine.visVersion,
          },
          customer: a.customer,
          screening: a.screening
            ? { outcome: a.screening.outcome, outcomeReason: a.screening.outcomeReason }
            : null,
          record: a.record,
        }))}
        records={records.map((r) => ({
          id: r.id,
          certificateCode: r.certificateCode,
          patientName: r.patientName,
          patientPhone: r.patientPhone,
          doseNumber: r.doseNumber,
          lotNumber: r.lotNumber,
          site: r.site,
          route: r.route,
          administeredAt: r.administeredAt.toISOString(),
          observationMinutes: r.observationMinutes,
          observationOutcome: r.observationOutcome,
          nextDueDate: r.nextDueDate ? r.nextDueDate.toISOString() : null,
          status: r.status,
          vaccine: r.vaccine,
          administeredBy: r.administeredBy,
          customer: r.customer,
          aefiReports: r.aefiReports.map((x) => ({ id: x.id, severity: x.severity })),
        }))}
        aefi={aefi.map((r) => ({
          id: r.id,
          severity: r.severity,
          symptoms: r.symptoms,
          actionTaken: r.actionTaken,
          outcome: r.outcome,
          reportedToAuthority: r.reportedToAuthority,
          onsetAt: r.onsetAt.toISOString(),
          immunization: { vaccine: r.immunization.vaccine, patientName: undefined },
        }))}
        counselling={counselling.map((s) => ({
          id: s.id,
          topic: s.topic,
          status: s.status,
          patientName: s.patientName,
          patientPhone: s.patientPhone,
          preferredDate: s.preferredDate,
          summary: s.summary,
          createdAt: s.createdAt.toISOString(),
        }))}
        campaigns={campaigns.map((c) => ({
          id: c.id,
          slug: c.slug,
          title: c.title,
          theme: c.theme,
          short: c.short,
          startDate: c.startDate.toISOString(),
          endDate: c.endDate ? c.endDate.toISOString() : null,
          targetDoses: c.targetDoses,
          dosesAdministered: c.dosesAdministered,
          active: c.active,
        }))}
        credentials={credentials.map((c) => ({
          id: c.id,
          title: c.title,
          credentialType: c.credentialType,
          issuedBy: c.issuedBy,
          expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
          user: c.user,
        }))}
        policy={{
          enabled: policy.enabled,
          jurisdiction: policy.jurisdiction,
          authorizingBody: policy.authorizingBody,
          authorizingRegulation: policy.authorizingRegulation,
          supervisingPharmacistRequired: policy.supervisingPharmacistRequired,
          observationMinutesDefault: policy.observationMinutesDefault,
          visRequired: policy.visRequired,
          walkInAccepted: policy.walkInAccepted,
          paediatricOnSite: policy.paediatricOnSite,
          publicDisclaimer: policy.publicDisclaimer,
          coldChainNotes: policy.coldChainNotes,
          aefiReportingContact: policy.aefiReportingContact,
        }}
        customers={customers}
        staff={staff}
      />
    </AdminShell>
  );
}
