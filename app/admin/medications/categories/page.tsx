import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { CategoryManager } from "@/app/components/admin/CategoryManager";
import { Tag, ArrowLeft } from "lucide-react";

export const metadata = { title: "Medication categories" };

/**
 * Lightweight category management without a separate Category model.
 * Categories are free-text on Medication; this page lists distinct values,
 * counts, and lets staff rename/merge via bulk update.
 */
export default async function MedicationCategoriesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const grouped = await prisma.medication.groupBy({
    by: ["category"],
    _count: { _all: true },
    orderBy: { category: "asc" },
  });

  const categories = grouped.map((g) => ({
    name: g.category || "general",
    count: g._count._all,
  }));

  return (
    <AdminShell
      user={user}
      title="Medication categories"
      subtitle="Manage taxonomy used across the catalogue (stored as free-text on each medication)"
      actions={
        <Link
          href="/admin/medications"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-3 py-1.5 text-xs font-semibold admin-accent-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to catalogue
        </Link>
      }
    >
      <AdminPanel
        title="Categories in use"
        description={`${categories.length} distinct categor${categories.length === 1 ? "y" : "ies"}`}
      >
        {categories.length === 0 ? (
          <AdminEmptyState
            icon={Tag}
            title="No categories yet"
            description="Add medications to start building the category list."
          />
        ) : (
          <CategoryManager initial={categories} />
        )}
      </AdminPanel>
    </AdminShell>
  );
}
