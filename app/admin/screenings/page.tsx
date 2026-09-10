import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import {
  listAdminScreenings,
  listAdminReferrals,
} from "@/app/lib/services/screening-service";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { AdminCard } from "@/app/components/admin/AdminUI";
import { AdminScreeningCenter } from "@/app/components/admin/AdminScreeningCenter";
import { Activity, Heart, Building2, AlertTriangle } from "lucide-react";
import styles from "./screenings.module.css";

export const metadata = { title: "Health Screenings & Clinical Referrals | Admin" };

export const dynamic = "force-dynamic";

export default async function AdminScreeningsPage() {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) redirect("/login");

  const screenings = await listAdminScreenings({ take: 150 }).catch(() => []);
  const referrals = await listAdminReferrals({ take: 100 }).catch(() => []);

  const customers = await prisma.customerProfile
    .findMany({
      select: { id: true, fullName: true, phone: true },
      orderBy: { fullName: "asc" },
      take: 200,
    })
    .catch(() => []);

  const formattedScreenings = screenings.map((s) => ({
    id: s.id,
    screeningType: s.screeningType,
    patientName: s.patientName,
    patientPhone: s.patientPhone,
    patientEmail: s.patientEmail,
    patientAge: s.patientAge,
    patientGender: s.patientGender,
    systolicBp: s.systolicBp,
    diastolicBp: s.diastolicBp,
    pulseRate: s.pulseRate,
    bpCategory: s.bpCategory,
    bloodGlucose: s.bloodGlucose != null ? Number(s.bloodGlucose.toString()) : null,
    glucoseUnit: s.glucoseUnit,
    fastingStatus: s.fastingStatus,
    glucoseCategory: s.glucoseCategory,
    weightKg: s.weightKg != null ? Number(s.weightKg.toString()) : null,
    heightCm: s.heightCm != null ? Number(s.heightCm.toString()) : null,
    bmi: s.bmi != null ? Number(s.bmi.toString()) : null,
    bmiCategory: s.bmiCategory,
    temperatureC: s.temperatureC != null ? Number(s.temperatureC.toString()) : null,
    tempCategory: s.tempCategory,
    spO2Percent: s.spO2Percent,
    poctType: s.poctType,
    poctResult: s.poctResult,
    notes: s.notes,
    equipmentUsed: s.equipmentUsed,
    requiresReferral: s.requiresReferral,
    referralUrgency: s.referralUrgency,
    createdAt: s.createdAt.toISOString(),
    customer: s.customer,
    conductedBy: s.conductedBy,
    referrals: s.referrals,
  }));

  const formattedReferrals = referrals.map((r) => ({
    id: r.id,
    referenceCode: r.referenceCode,
    destinationType: r.destinationType,
    facilityName: r.facilityName,
    facilityContact: r.facilityContact,
    specialistType: r.specialistType,
    urgency: r.urgency,
    reason: r.reason,
    clinicalSummary: r.clinicalSummary,
    pharmacistRecommendations: r.pharmacistRecommendations,
    status: r.status,
    issuedAt: r.issuedAt.toISOString(),
    patientName: r.patientName,
    patientPhone: r.patientPhone,
    patientEmail: r.patientEmail,
    patientGender: r.patientGender,
    customer: r.customer,
    referredBy: r.referredBy,
    screening: r.screening,
  }));

  const totalScreenings = formattedScreenings.length;
  const referralCount = formattedReferrals.length;
  const htnFlags = formattedScreenings.filter(
    (s) => s.bpCategory === "stage_2_hypertension" || s.bpCategory === "hypertensive_crisis"
  ).length;
  const emergencyFlags = formattedReferrals.filter((r) => r.urgency === "emergency").length;

  return (
    <AdminShell
      user={user}
      title="Screenings & referrals"
      subtitle="Record vital signs first, surface clinical risk quickly, and move flagged patients into the right referral path."
    >
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminCard
          label="Screenings"
          value={totalScreenings}
          hint="Logged vital checks"
          icon={Activity}
          accent="accent"
        />
        <AdminCard
          label="Clinical flags"
          value={htnFlags}
          hint="Elevated vital markers"
          icon={Heart}
          accent="danger"
        />
        <AdminCard
          label="Referrals"
          value={referralCount}
          hint="Issued onward referrals"
          icon={Building2}
          accent="info"
        />
        <AdminCard
          label="Emergencies"
          value={emergencyFlags}
          hint="Immediate-transfer cases"
          icon={AlertTriangle}
          accent="danger"
        />
      </div>

      <div className={styles.surface}>
        <AdminScreeningCenter
          screenings={formattedScreenings}
          referrals={formattedReferrals}
          customers={customers}
        />
      </div>
    </AdminShell>
  );
}
