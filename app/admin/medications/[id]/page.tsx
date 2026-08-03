import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateMedicationAction } from "@/app/actions/admin";
import { AdminPanel } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import MedicationFormWithDefaults from "./MedicationFormWithDefaults";

export const metadata = { title: "Edit medication" };

export default async function EditMedicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const med = await prisma.medication.findUnique({ where: { id } }).catch((err) => {
    console.error("[admin/medications/[id]] lookup failed:", err);
    return null;
  });
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
    active: Boolean(med.active),
  };

  return (
    <AdminShell user={user} title={`Edit: ${med.name}`} subtitle={med.category}>
      <div className="max-w-2xl">
        <AdminPanel>
          <MedicationFormWithDefaults action={adminCreateMedicationAction} defaults={defaults} />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
