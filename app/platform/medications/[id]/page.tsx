import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import {
  PlatformPage,
  PlatformSection,
  PlatformStat,
} from "@/app/platform/_components/PlatformPage";
import { getPlatformMedicationById } from "@/app/lib/services/platform-medication-library";
import { MedicationEditForm } from "./MedicationEditForm";
import {
  ArrowLeft,
  CheckCircle2,
  GitMerge,
  History,
  Pill,
  ShieldCheck,
  Store,
  Tag,
  XCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const { master } = await getPlatformMedicationById(id);
  return {
    title: master ? `${master.name} — Shared Library` : "Medication Details",
  };
}

export default async function PlatformMedicationDetailPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/platform/medications");
  if (!user.platformAdmin) redirect("/admin");

  const { id } = await params;
  const { master, auditLogs } = await getPlatformMedicationById(id);

  if (!master) notFound();

  const [dosageForms, routes, pregnancyCategories, manufacturers] = await Promise.all([
    prismaUnscoped.medicationLookup.findMany({
      where: { kind: "dosage_form", active: true },
      select: { id: true, value: true },
      orderBy: { value: "asc" },
    }),
    prismaUnscoped.medicationLookup.findMany({
      where: { kind: "route", active: true },
      select: { id: true, value: true },
      orderBy: { value: "asc" },
    }),
    prismaUnscoped.medicationLookup.findMany({
      where: { kind: "pregnancy_category", active: true },
      select: { id: true, value: true },
      orderBy: { value: "asc" },
    }),
    prismaUnscoped.manufacturer.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const pharmacyCount = master.pharmacyInventory.length;

  return (
    <PlatformPage
      eyebrow="Canonical Clinical Drug"
      title={master.name}
      description={`Generic: ${master.genericName} • Category: ${master.category} • Created ${new Date(master.createdAt).toLocaleDateString()}`}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/platform/medications"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-3.5 py-2 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-hover)]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to library
          </Link>
          <Link
            href={`/platform/medications/review?duplicateId=${master.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
          >
            <GitMerge className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Duplicate merge
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top summary stats */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PlatformStat
            label="Canonical Status"
            value={master.status.toUpperCase()}
            tone={master.status === "active" ? "success" : master.status === "needs_review" ? "warning" : "default"}
          />
          <PlatformStat
            label="Enrichment"
            value={`${master.enrichmentScore}%`}
            detail={master.enrichmentStatus}
            tone={master.enrichmentScore >= 80 ? "success" : "default"}
          />
          <PlatformStat
            label="Network Adoption"
            value={`${pharmacyCount} ${pharmacyCount === 1 ? "pharmacy" : "pharmacies"}`}
            tone={pharmacyCount > 0 ? "success" : "default"}
            detail={pharmacyCount > 0 ? "In active inventory" : "Orphan master"}
          />
          <PlatformStat
            label="Acquisition"
            value={master.acquisitionMethod}
            detail={`Updated ${new Date(master.updatedAt).toLocaleDateString()}`}
          />
        </section>

        {master.mergedInto && (
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-900 dark:text-blue-200">
            <span className="font-semibold">Merged Record:</span> This medication master was merged into{" "}
            <Link
              href={`/platform/medications/${master.mergedInto.id}`}
              className="font-bold underline"
            >
              {master.mergedInto.name} ({master.mergedInto.genericName})
            </Link>
            .
          </div>
        )}

        {/* Section 1: Canonical Clinical Editor */}
        <PlatformSection
          title="Clinical Information"
          description="Standardized clinical and pharmaceutical fields. These are shared across all pharmacies and public views."
        >
          <MedicationEditForm
            master={master}
            dosageForms={dosageForms}
            routes={routes}
            pregnancyCategories={pregnancyCategories}
            manufacturers={manufacturers}
          />
        </PlatformSection>

        {/* Section 2: Active Ingredients & Tags */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PlatformSection title="Active Ingredients" description="Chemical entities and strength components.">
            <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 shadow-[var(--admin-shadow)]">
              {master.activeIngredients.length === 0 ? (
                <p className="text-xs text-[var(--admin-text-muted)] italic">No active ingredients recorded.</p>
              ) : (
                <ul className="divide-y divide-[var(--admin-border)]">
                  {master.activeIngredients.map((ai: any) => (
                    <li key={ai.id} className="flex items-center justify-between py-2 text-xs">
                      <span className="font-semibold text-[var(--admin-text)]">
                        {ai.activeIngredient.name}
                      </span>
                      <span className="rounded bg-[var(--admin-panel)] px-2 py-0.5 text-[11px] text-[var(--admin-text-muted)]">
                        {ai.amount ? `${ai.amount} ${ai.unit || ""}` : "Unspecified"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </PlatformSection>

          <PlatformSection title="Clinical Tags" description="Therapeutic and pharmacologic tags.">
            <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 shadow-[var(--admin-shadow)]">
              {master.clinicalTags.length === 0 ? (
                <p className="text-xs text-[var(--admin-text-muted)] italic">No clinical tags assigned.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {master.clinicalTags.map((ct: any) => (
                    <span
                      key={ct.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-panel)] px-2.5 py-1 text-xs font-medium text-[var(--admin-text)]"
                    >
                      <Tag className="h-3 w-3 text-[var(--admin-accent)]" />
                      {ct.clinicalTag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </PlatformSection>
        </div>

        {/* Section 3: SEPARATE Pharmacy Adoption List */}
        <PlatformSection
          title="Network Adoption & Inventory"
          description="Pharmacies currently stocking this canonical medication. Commercial details (stock, price, SKU) belong exclusively to each pharmacy and are kept separate from canonical clinical data."
        >
          <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-[var(--admin-shadow)]">
            {master.pharmacyInventory.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--admin-text-muted)]">
                <Store className="mx-auto h-8 w-8 opacity-25 mb-2" />
                <p className="font-semibold text-sm">No pharmacies have stocked this medication yet.</p>
                <p className="mt-1">
                  This shared record is safe in the library. When a pharmacy chooses "Add to my inventory", their commercial record will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-panel)] text-[var(--admin-text-soft)]">
                    <tr>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">Pharmacy</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">Location</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">SKU</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">Selling Price</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">Stock</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">Public Listing</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">Inventory Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border)]">
                    {master.pharmacyInventory.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-[var(--admin-hover)]">
                        <td className="px-4 py-3 font-semibold text-[var(--admin-text)]">
                          {inv.pharmacy.name}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                          {inv.pharmacy.city || "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[var(--admin-text)]">
                          {inv.sku || "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[var(--admin-text)]">
                          KES {Number(inv.price).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-semibold ${
                              inv.currentStock > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
                            }`}
                          >
                            {inv.currentStock} units
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {inv.publicListing ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Listed publicly
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <XCircle className="h-3.5 w-3.5" /> Hidden (internal only)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {inv.active ? (
                            <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-300">
                              Active
                            </span>
                          ) : (
                            <span className="rounded bg-rose-500/10 px-2 py-0.5 font-medium text-rose-700 dark:text-rose-300">
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </PlatformSection>

        {/* Section 4: Audit History */}
        <PlatformSection
          title="Audit History"
          description="Chronological record of platform mutations, merges, and imports affecting this medication."
        >
          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 shadow-[var(--admin-shadow)]">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-[var(--admin-text-muted)] italic">No explicit audit events recorded.</p>
            ) : (
              <ul className="divide-y divide-[var(--admin-border)]">
                {auditLogs.map((log: any) => (
                  <li key={log.id} className="py-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--admin-text)]">
                        {log.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-[11px] text-[var(--admin-text-soft)]">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--admin-text-muted)]">
                      By: {log.actor?.email || "System"}
                    </p>
                    {log.details && (
                      <pre className="mt-1 overflow-x-auto rounded bg-[var(--admin-panel)] p-2 text-[10px] text-[var(--admin-text-soft)]">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PlatformSection>
      </div>
    </PlatformPage>
  );
}
