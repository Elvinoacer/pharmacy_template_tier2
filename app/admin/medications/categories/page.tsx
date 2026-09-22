import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { listCategoriesWithCounts } from "@/app/lib/medication-categories";
import { AdminPanel, AdminEmptyState, AdminCard } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { CategoryManager } from "@/app/components/admin/CategoryManager";
import { Tag, ArrowLeft, Package, FolderTree, Sparkles } from "lucide-react";

export const metadata = { title: "Medication categories" };

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

  const totalMeds = categories.reduce((sum, category) => sum + category.count, 0);
  const activeCategories = categories.filter((category) => category.active).length;
  const emptyCats = categories.filter((category) => category.count === 0).length;

  return (
    <AdminShell
      user={user}
      title="Medicine categories"
      subtitle="Keep the catalogue easy to browse by maintaining a clear, patient-friendly medicine taxonomy."
      actions={
        <Link
          href="/admin/medications"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--admin-inset)] px-4 text-sm font-semibold admin-accent-text transition hover:bg-[var(--admin-inset-2)] sm:w-auto sm:rounded-full"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to catalogue
        </Link>
      }
    >
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        {loadError && (
          <div className="admin-alert-error">
            <span>{loadError}</span>
          </div>
        )}

        <section aria-label="Category overview" className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <AdminCard
            label="Categories"
            value={categories.length}
            hint={`${activeCategories} active`}
            icon={FolderTree}
            accent="accent"
          />
          <AdminCard
            label="Medicines tagged"
            value={totalMeds}
            hint="Across all categories"
            icon={Package}
            accent="info"
          />
          <div>
            <AdminCard
              label="Empty categories"
              value={emptyCats}
              hint="Ready for new products"
              icon={Sparkles}
              accent="neutral"
            />
          </div>
        </section>

        <AdminPanel
          title="Category registry"
          description="Search first, then create, edit, merge, hide, or retire categories. Slug changes automatically re-tag linked medicines."
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
      </div>
    </AdminShell>
  );
}
