import { redirect } from "next/navigation";
import { withPlatformBypass } from "@/app/lib/tenant-context";
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
import { getTenant } from "@/app/lib/tenant";

export const metadata = { title: "Health Screenings & Vitals Tracker" };

export const dynamic = "force-dynamic";

export default async function PortalScreeningsPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  const customerId = user.customerId;
  await requireOnboarded();
  const tenant = await getTenant().catch(() => ({ slug: null as string | null }));
  const shopBase = tenant.slug ? `/p/${tenant.slug}` : null;

  return withPlatformBypass(async () => {
  const screenings = await listCustomerScreenings(customerId).catch(() => []);
  const referrals = await listCustomerReferrals(customerId).catch(() => []);

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
      subtitle="View your vital measurements, blood pressure, blood glucose, BMI, and clinical referrals issued by your pharmacy."
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href={shopBase ? `${shopBase}/services/health-screenings` : "/services/health-screenings"}
            className="min-w-11 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-card px-3 py-2 text-sm font-semibold text-brand shadow-2xs transition hover:bg-brand-tint sm:w-auto"
          >
            <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
            <span>Book Screening</span>
          </Link>
          <Link
            href={shopBase ? `${shopBase}/screenings` : "/screenings"}
            className="min-w-11 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-card px-3 py-2 text-sm font-semibold text-muted shadow-2xs transition hover:bg-brand-tint hover:text-brand sm:w-auto"
          >
            <Activity className="h-3.5 w-3.5 shrink-0" />
            <span>Screening Guide</span>
          </Link>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-7xl min-w-0">
        <PortalScreeningsView
        screenings={formattedScreenings}
        referrals={formattedReferrals}
          patientName={user.fullName || "Patient"}
        />
      </div>
    </PortalShell>
  );
  });
}
