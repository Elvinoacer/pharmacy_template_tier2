import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { Panel, Badge, EmptyState } from "@/app/components/portal/PortalWidgets";
import DigitalCounsellingCard from "@/app/components/health/DigitalCounsellingCard";
import MissedDoseCalculator from "@/app/components/health/MissedDoseCalculator";
import DeviceDosageViewer from "@/app/components/health/DeviceDosageViewer";
import {
  generateDynamicCounsellingProfile,
  type MedicationCounsellingProfile,
} from "@/app/lib/medication-counselling";
import { getMedicationCounsellingBySlug } from "@/app/lib/services/medication-counselling-db";
import { getTenant } from "@/app/lib/tenant";
import {
  Pill,
  ShieldCheck,
  Calendar,
  PhoneCall,
  Clock,
  ExternalLink,
  BookOpen,
  Sparkles,
  HelpCircle,
  FileText,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Medication Counselling & Patient Guides | Portal" };

export default async function PortalCounsellingPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();
  const tenant = await getTenant().catch(() => ({ slug: null as string | null }));
  const shopBase = tenant.slug ? `/p/${tenant.slug}` : null;

  // Fetch active customer prescriptions and orders
  const [prescriptions, otcOrders] = await Promise.all([
    prisma.prescription.findMany({
      where: { customerId: user.customerId, status: "active" },
      include: {
        medication: {
          include: {
            medicationMaster: {
              include: {
                dosageForm: true,
                route: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: { customerId: user.customerId, status: { in: ["paid", "fulfilled"] } },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Generate counselling profiles for each prescription
  const prescriptionProfiles: Array<{
    prescriptionId: string;
    medicineName: string;
    dosage: string | null;
    schedule: string | null;
    counselling: MedicationCounsellingProfile;
  }> = [];

  for (const rx of prescriptions) {
    let profile: MedicationCounsellingProfile | null = null;
    if (rx.medication?.slug) {
      profile = await getMedicationCounsellingBySlug(rx.medication.slug);
    }
    if (!profile) {
      profile = generateDynamicCounsellingProfile(
        rx.medicineName,
        rx.medication?.medicationMaster?.genericName || rx.medicineName,
        rx.medication?.medicationMaster?.category || "general",
        rx.medication?.medicationMaster?.dosageForm?.value || null,
        rx.dosage,
        rx.medication?.medicationMaster?.storage || null,
        rx.medication?.medicationMaster?.sideEffects || null
      );
    }

    prescriptionProfiles.push({
      prescriptionId: rx.id,
      medicineName: rx.medicineName,
      dosage: rx.dosage,
      schedule: rx.schedule,
      counselling: profile,
    });
  }

  return (
    <PortalShell
      user={user}
      title="Medication Counselling"
      subtitle="12-pillar digital patient counselling leaflets and safety protocols for your active medications."
      actions={
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <Link
            href={shopBase ? `${shopBase}/services/medication-counselling` : "/services/medication-counselling"}
            className="btn-primary inline-flex w-full items-center justify-center gap-1.5 text-xs sm:w-auto"
          >
            <PhoneCall className="h-4 w-4" /> Book Pharmacist Consult
          </Link>
          <Link
            href={shopBase ? `${shopBase}/health/counselling` : "/health/counselling"}
            className="btn-ghost inline-flex w-full items-center justify-center gap-1.5 bg-white text-xs sm:w-auto"
          >
            <BookOpen className="h-4 w-4" /> Full Public Hub
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Top Info Banner */}
        <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-white to-emerald-50 p-4 shadow-xs sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-teal-950">
                Your Digital Medication Counselling Leaflets
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-teal-900">
                Below are the official 12-pillar clinical counselling guides for your current active prescriptions. Review dosage administration, food interactions, missed-dose instructions, and when to seek medical attention.
              </p>
            </div>
          </div>
        </div>

        {/* Active Prescriptions Digital Leaflets */}
        {prescriptionProfiles.length === 0 ? (
          <Panel title="Active Prescriptions" description="Your tailored medication leaflets">
            <EmptyState
              icon={FileText}
              title="No active prescriptions found"
              description="When you have active prescriptions issued by your pharmacy, their complete 12-pillar digital counselling leaflets will appear here."
            />
          </Panel>
        ) : (
          <div className="space-y-8">
            {prescriptionProfiles.map(({ prescriptionId, medicineName, dosage, schedule, counselling }) => (
              <div key={prescriptionId} className="min-w-0 space-y-3">
                <div className="flex min-w-0 flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-xs font-bold text-white">
                      💊
                    </span>
                    <h3 className="min-w-0 break-words text-base font-bold text-[#0c1a14]">{medicineName}</h3>
                    {dosage && (
                      <span className="max-w-full break-words rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {dosage}
                      </span>
                    )}
                  </div>
                  <Link
                    href="/portal/prescriptions"
                    className="inline-flex w-fit shrink-0 text-xs font-bold text-teal-800 hover:underline"
                  >
                    View Dose Tracker →
                  </Link>
                </div>

                <DigitalCounsellingCard counselling={counselling} showFullActions={true} />
              </div>
            ))}
          </div>
        )}

        {/* Missed Dose Calculator */}
        <Panel
          title="Missed-Dose Decision Engine"
          description="Instant clinical protocol if you forgot a dose"
        >
          <MissedDoseCalculator />
        </Panel>

        {/* Special Dosage Forms & Device Techniques */}
        <Panel
          title="Dosage Form & Medical Device Library"
          description="Illustrated step-by-step techniques for inhalers, eye drops, ear drops, nasal sprays, and monitors"
        >
          <DeviceDosageViewer />
        </Panel>
      </div>
    </PortalShell>
  );
}
