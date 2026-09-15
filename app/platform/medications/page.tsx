import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import {
  PlatformPage,
  PlatformSection,
  PlatformStat,
} from "@/app/platform/_components/PlatformPage";
import {
  getPlatformMedicationMetrics,
  listPlatformMedications,
  type PlatformMedicationFilterOptions,
} from "@/app/lib/services/platform-medication-library";
import { MedicationsTable } from "./MedicationsTable";
import { FileUp, GitMerge, Pill, ShieldAlert, Sparkles, Store } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shared Medication Library — Platform Admin" };

type Props = {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    sort?: string;
    sortDir?: string;
    category?: string;
    manufacturerId?: string;
    dosageFormId?: string;
    status?: string;
    missingData?: string;
    controlledDrug?: string;
    enrichmentStatus?: string;
    acquisitionMethod?: string;
    createdFrom?: string;
    createdTo?: string;
  }>;
};

export default async function PlatformMedicationsPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/platform/medications");
  if (!user.platformAdmin) redirect("/admin");

  const sp = await searchParams;

  const filterOpts: PlatformMedicationFilterOptions = {
    page: sp.page ? parseInt(sp.page, 10) : 1,
    pageSize: sp.pageSize ? parseInt(sp.pageSize, 10) : 25,
    search: sp.search || undefined,
    sort: (sp.sort as any) || "updatedAt",
    sortDir: (sp.sortDir as any) || "desc",
    category: sp.category || undefined,
    manufacturerId: sp.manufacturerId || undefined,
    dosageFormId: sp.dosageFormId || undefined,
    status: (sp.status as any) || undefined,
    missingData: (sp.missingData as any) || undefined,
    controlledDrug: sp.controlledDrug === "true" ? true : sp.controlledDrug === "false" ? false : undefined,
    enrichmentStatus: (sp.enrichmentStatus as any) || undefined,
    acquisitionMethod: sp.acquisitionMethod || undefined,
    createdFrom: sp.createdFrom || undefined,
    createdTo: sp.createdTo || undefined,
  };

  const [metrics, data, categories, dosageForms, manufacturers] = await Promise.all([
    getPlatformMedicationMetrics(),
    listPlatformMedications(filterOpts),
    prismaUnscoped.medicationCategory.findMany({
      select: { slug: true, name: true },
      distinct: ["slug"],
      orderBy: { name: "asc" },
    }),
    prismaUnscoped.medicationLookup.findMany({
      where: { kind: "dosage_form", active: true },
      select: { id: true, value: true },
      orderBy: { value: "asc" },
    }),
    prismaUnscoped.manufacturer.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const actions = (
    <div className="flex items-center gap-2.5">
      <Link
        href="/platform/medications/review"
        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
          metrics.needsReview > 0
            ? "border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
            : "border border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-text)] hover:bg-[var(--admin-hover)]"
        }`}
      >
        <GitMerge className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span>Review queue</span>
        {metrics.needsReview > 0 && (
          <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
            {metrics.needsReview}
          </span>
        )}
      </Link>
      <Link
        href="/platform/medications/import"
        className="inline-flex items-center gap-2 rounded-xl bg-[var(--admin-accent)] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-105"
      >
        <FileUp className="h-4 w-4" />
        <span>Import CSV</span>
      </Link>
    </div>
  );

  return (
    <PlatformPage
      eyebrow="Platform Shared Library"
      title="Canonical Medications"
      description="The global shared medication master catalogue. These records provide standardized clinical identity across the entire network. A medicine here is never publicly visible or stocked by any pharmacy until an individual pharmacy explicitly adds it to its inventory."
      actions={actions}
    >
      <div className="space-y-6">
        {/* Operational Metrics Grid */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <PlatformStat
            label="Total Shared"
            value={metrics.total.toLocaleString()}
            detail={`${metrics.active.toLocaleString()} active`}
          />
          <PlatformStat
            label="Needs Review"
            value={metrics.needsReview}
            tone={metrics.needsReview > 0 ? "warning" : "default"}
            detail={metrics.needsReview > 0 ? "Requires action" : "Queue clear"}
          />
          <PlatformStat
            label="Deprecated / Arch."
            value={metrics.deprecatedOrArchived}
            detail={`${metrics.archived} archived`}
          />
          <PlatformStat
            label="Enriched"
            value={`${Math.round((metrics.complete / (metrics.total || 1)) * 100)}%`}
            tone="success"
            detail={`${metrics.complete} complete clinicals`}
          />
          <PlatformStat
            label="Missing Barcode"
            value={metrics.missingBarcode}
            tone={metrics.missingBarcode > 0 ? "warning" : "default"}
            detail="Needs GTIN enrichment"
          />
          <PlatformStat
            label="Orphan Masters"
            value={metrics.orphans}
            detail="0 pharmacies stocking"
          />
        </section>

        {/* Paginated Table and Filters */}
        <PlatformSection
          title="Medication Registry"
          description="Filter and manage the shared master library. Select rows to perform bulk lifecycle actions."
        >
          <MedicationsTable
            items={data.items}
            total={data.total}
            page={data.page}
            pageSize={data.pageSize}
            totalPages={data.totalPages}
            categories={categories}
            dosageForms={dosageForms}
            manufacturers={manufacturers}
          />
        </PlatformSection>
      </div>
    </PlatformPage>
  );
}
