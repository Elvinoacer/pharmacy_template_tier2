import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage } from "@/app/platform/_components/PlatformPage";
import { PlatformReviewFlow, type ReviewItem } from "./PlatformReviewFlow";
import { ArrowLeft } from "lucide-react";
import type { Prisma } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Medication Review Queue — Platform Admin",
};

export default async function PlatformMedicationReviewPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/platform/medications/review");
  if (!user.platformAdmin) redirect("/admin");

  // Query records flagged for review
  const [total, rawItems] = await Promise.all([
    prismaUnscoped.medicationMaster.count({
      where: { status: "needs_review" },
    }),
    prismaUnscoped.medicationMaster.findMany({
      where: { status: "needs_review" },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        dosageForm: { select: { id: true, value: true } },
        manufacturer: { select: { id: true, name: true } },
        activeIngredients: {
          include: {
            activeIngredient: { select: { name: true } },
          },
        },
        _count: {
          select: { pharmacyInventory: true },
        },
      },
    }),
  ]);

  // For each review item, query candidate matches in the active canonical registry
  const items: ReviewItem[] = await Promise.all(
    rawItems.map(async (item) => {
      const orClauses: Prisma.MedicationMasterWhereInput[] = [];

      if (item.barcode) {
        orClauses.push({ barcode: item.barcode });
      }

      if (item.genericName) {
        orClauses.push({
          genericName: {
            equals: item.genericName,
            mode: "insensitive",
          },
        });
      }

      const candidates =
        orClauses.length > 0
          ? await prismaUnscoped.medicationMaster.findMany({
              where: {
                id: { not: item.id },
                status: "active",
                OR: orClauses,
              },
              take: 3,
              select: {
                id: true,
                name: true,
                genericName: true,
                brandName: true,
                strengthDisplay: true,
                barcode: true,
                status: true,
                dosageForm: { select: { value: true } },
                manufacturer: { select: { name: true } },
                _count: { select: { pharmacyInventory: true } },
              },
            })
          : [];

      return {
        id: item.id,
        name: item.name,
        genericName: item.genericName,
        brandName: item.brandName,
        strengthDisplay: item.strengthDisplay,
        packSize: item.packSize,
        category: item.category,
        barcode: item.barcode,
        status: item.status,
        controlledDrug: item.controlledDrug,
        controlledDrugSchedule: item.controlledDrugSchedule,
        enrichmentStatus: item.enrichmentStatus,
        enrichmentScore: item.enrichmentScore,
        acquisitionMethod: item.acquisitionMethod,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        dosageForm: item.dosageForm,
        manufacturer: item.manufacturer,
        activeIngredients: item.activeIngredients.map((ai) => ({
          amount: ai.amount,
          unit: ai.unit,
          activeIngredient: ai.activeIngredient,
        })),
        _count: item._count,
        candidateMatches: candidates.map((c) => ({
          id: c.id,
          name: c.name,
          genericName: c.genericName,
          brandName: c.brandName,
          strengthDisplay: c.strengthDisplay,
          dosageForm: c.dosageForm,
          manufacturer: c.manufacturer,
          barcode: c.barcode,
          status: c.status,
          pharmacyCount: c._count.pharmacyInventory,
        })),
      };
    })
  );

  const actions = (
    <div className="flex items-center gap-2">
      <Link
        href="/platform/medications"
        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-3.5 py-2 text-xs font-semibold text-[var(--admin-text)] transition hover:bg-[var(--admin-hover)]"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Registry</span>
      </Link>
    </div>
  );

  return (
    <PlatformPage
      eyebrow="Platform Shared Library"
      title="Medication Review Queue"
      description="Review flagged medications, resolve duplicate candidates, and verify clinical identity before promoting items to active status in the global catalogue."
      actions={actions}
    >
      <PlatformReviewFlow items={items} total={total} />
    </PlatformPage>
  );
}
