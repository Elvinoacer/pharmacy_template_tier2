import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateMedicationAction } from "@/app/actions/admin";
import { listActiveCategoryOptions } from "@/app/lib/medication-categories";
import { AdminShell } from "@/app/components/admin/AdminShell";
import MedicationFormWithDefaults from "./MedicationFormWithDefaults";
import { ArrowLeft, Pill } from "lucide-react";

export const metadata = { title: "Edit medication" };

export default async function EditMedicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const [med, categories] = await Promise.all([
    prisma.medication.findUnique({ where: { id } }).catch((err) => {
      console.error("[admin/medications/[id]] lookup failed:", err);
      return null;
    }),
    listActiveCategoryOptions(),
  ]);
  if (!med) notFound();

  // Pass only plain strings/booleans into the client form (no Prisma Decimal).
  const defaults = {
    id: med.id,
    name: med.name,
    slug: med.slug,
    sku: med.sku || "",
    category: med.category,
    description: med.description || "",
    indications: med.indications || "",
    dosage: med.dosage || "",
    sideEffects: med.sideEffects || "",
    contraindications: med.contraindications || "",
    storage: med.storage || "",
    price: String(Number(med.price ?? 0)),
    overTheCounter: Boolean(med.overTheCounter),
    publicListing: Boolean(med.publicListing),
    prescriptionRequired: Boolean(med.prescriptionRequired),
    stockQty: String(med.stockQty ?? 0),
    lowStockThreshold: String(med.lowStockThreshold ?? 10),
    imageUrl: med.imageUrl || "",
    imageUrls: med.imageUrls || "",
    active: Boolean(med.active),
  };

  return (
    <AdminShell user={user} title={`Edit: ${med.name}`} subtitle={med.category}>
      <div className="mb-6">
        <Link
          href="/admin/medications"
          className="group inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Catalog
        </Link>
      </div>

      <div className="mx-auto max-w-3xl">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200/60 bg-white/40 shadow-2xl shadow-emerald-500/10 ring-1 ring-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-black/20 dark:ring-white/10">
          <div className="pointer-events-none absolute -inset-px rounded-3xl opacity-20 transition-opacity duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-teal-500/20" />
          </div>

          <div className="relative border-b border-gray-200/50 bg-white/50 p-8 dark:border-white/5 dark:bg-black/20">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
                <Pill className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Medication</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{med.name} · {med.category.replace(/-/g, " ")}</p>
              </div>
            </div>
          </div>

          <div className="relative p-8">
            <MedicationFormWithDefaults
              action={adminCreateMedicationAction}
              defaults={defaults}
              categories={categories}
            />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
