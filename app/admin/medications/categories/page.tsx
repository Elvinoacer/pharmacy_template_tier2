import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { listCategoriesWithCounts } from "@/app/lib/medication-categories";
import { AdminPanel, AdminEmptyState, AdminCard } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { CategoryManager } from "@/app/components/admin/CategoryManager";
import { Tag, ArrowLeft, Package, FolderTree, Sparkles } from "lucide-react";

export const metadata = { title: "Medication categories" };

/**
 * Full category management for the drug catalogue.
 * Categories live in medication_categories; Medication.category stores the slug.
 */
export default async function MedicationCategoriesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  let categories: Awaited<ReturnType<typeof listCategoriesWithCounts>> = [];
  let loadError: string | null = null;

  try {
    categories = await listCategoriesWithCounts();
  } catch (err) {
    console.error("[admin/medications/categories]", err);
    loadError =
      "Could not load categories. If this is a fresh deploy, run `npm run db:migrate`.";
  }

  const totalMeds = categories.reduce((s, c) => s + c.count, 0);
  const emptyCats = categories.filter((c) => c.count === 0).length;

  return (
    <AdminShell
      user={user}
      title="Medication categories"
      subtitle="Create, rename, merge, and organize the catalogue taxonomy"
      actions={
        <Link
          href="/admin/medications"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-3 py-1.5 text-xs font-semibold admin-accent-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to catalogue
        </Link>
      }
    >
      {loadError && (
        <div className="admin-alert-error mb-4">
          <span>{loadError}</span>
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <AdminCard
          label="Categories"
          value={categories.length}
          hint={`${categories.filter((c) => c.active).length} active`}
          icon={FolderTree}
          accent="accent"
        />
        <AdminCard
          label="Medications tagged"
          value={totalMeds}
          hint="Sum of meds per category"
          icon={Package}
          accent="info"
        />
        <AdminCard
          label="Empty categories"
          value={emptyCats}
          hint="Ready for new products"
          icon={Sparkles}
          accent="neutral"
        />
      </div>

      <AdminPanel
        title="Category registry"
        description="Manage taxonomy for the drug catalogue and public medicines browse. Add an image, brands, and tips for public category pages. Renaming a slug re-tags every linked drug."
      >
        {loadError ? (
          <AdminEmptyState
            icon={Tag}
            title="Categories unavailable"
            description={loadError}
          />
        ) : (
          <CategoryManager initial={categories} />
        )}
      </AdminPanel>
    </AdminShell>
  );
}
