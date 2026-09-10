import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { AdminShell } from "@/app/components/admin/AdminShell";
import Link from "next/link";
import { ArrowLeft, FileCheck2, FileSpreadsheet, TableProperties } from "lucide-react";
import { CsvImportFlow } from "./CsvImportFlow";

export const metadata = { title: "Import from Excel / CSV — Medication" };

export default async function CsvImportPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AdminShell
      user={user}
      title="Import a medicine list"
      subtitle="Upload a CSV, match your columns to medicine fields, preview the result, then import in one controlled batch."
    >
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        <Link
          href="/admin/medications/add"
          className="group inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 text-sm font-medium admin-muted transition hover:text-[var(--admin-text)] sm:min-h-0 sm:bg-transparent sm:px-0"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back to acquisition methods
        </Link>

        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 sm:p-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Fast bulk acquisition with a review checkpoint</p>
              <p className="mt-1 text-xs leading-5 text-amber-800/75 dark:text-amber-200/75">
                Save Excel files as CSV first. Existing medication masters are matched before new ones are created, and incomplete clinical data can be enriched later.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              [FileSpreadsheet, "Upload", "CSV with headers in row one"],
              [TableProperties, "Map", "Match columns to system fields"],
              [FileCheck2, "Review", "Preview before committing rows"],
            ].map(([Icon, label, hint]) => {
              const ItemIcon = Icon as typeof FileSpreadsheet;
              return (
                <div key={label as string} className="flex items-center gap-2 rounded-xl border border-amber-500/15 bg-[var(--admin-card)] p-3">
                  <ItemIcon className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                  <div>
                    <p className="text-xs font-semibold admin-text">{label as string}</p>
                    <p className="mt-0.5 text-[11px] admin-muted">{hint as string}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <CsvImportFlow />
      </div>
    </AdminShell>
  );
}
