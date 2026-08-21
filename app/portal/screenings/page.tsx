import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { PortalShell } from "@/app/components/portal/PortalShell";
import {
  listCustomerScreenings,
  listCustomerReferrals,
} from "@/app/lib/services/screening-service";
import { PortalScreeningsView } from "@/app/components/portal/PortalScreeningsView";
import Link from "next/link";
import { Activity, CalendarCheck } from "lucide-react";

export const metadata = { title: "Health Screenings & Vitals Tracker" };

export const dynamic = "force-dynamic";

export default async function PortalScreeningsPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();

  const screenings = await listCustomerScreenings(user.customerId).catch(() => []);
  const referrals = await listCustomerReferrals(user.customerId).catch(() => []);

  const formattedScreenings = screenings.map((s) => ({
    id: s.id,
    screeningType: s.screeningType,
    patientName: s.patientName,
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
    poctValues: s.poctValues,
    notes: s.notes,
    equipmentUsed: s.equipmentUsed,
    requiresReferral: s.requiresReferral,
    referralUrgency: s.referralUrgency,
    createdAt: s.createdAt.toISOString(),
    conductedBy: s.conductedBy,
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
    referredBy: r.referredBy,
    screening: r.screening,
  }));

  return (
    <PortalShell
      user={user}
      title="Health Screenings & Vitals"
      subtitle="View your vital measurements, blood pressure, blood glucose, BMI, and clinical referrals issued by Aether Pharmacy."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/services/health-screenings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e3ebe6] bg-white px-3 py-2 text-xs font-semibold text-[#0d6e5a] hover:bg-[#f2f7f4] shadow-2xs transition"
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            <span>Book Screening</span>
          </Link>
          <Link
            href="/screenings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e3ebe6] bg-white px-3 py-2 text-xs font-semibold text-[#5a6b62] hover:bg-[#f2f7f4] shadow-2xs transition"
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Screening Guide</span>
          </Link>
        </div>
      }
    >
      <PortalScreeningsView
        screenings={formattedScreenings}
        referrals={formattedReferrals}
        patientName={user.fullName || "Patient"}
      />
    </PortalShell>
  );
}
