import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { AdminShell } from "@/app/components/admin/AdminShell";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Library, Search } from "lucide-react";
import { LibrarySearchFlow } from "./LibrarySearchFlow";

export const metadata = { title: "Shared Medication Library" };

export default async function LibraryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AdminShell
      user={user}
      title="Medicine library"
      subtitle="Reuse trusted medicine records and only add the stock, pricing, and shelf details specific to your pharmacy."
    >
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        <Link
          href="/admin/medications/add"
          className="group inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 text-sm font-medium admin-muted transition hover:text-[var(--admin-text)] sm:min-h-0 sm:bg-transparent sm:px-0"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back to acquisition methods
        </Link>

        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 sm:p-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <Library className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Search before creating a duplicate</p>
              <p className="mt-1 text-xs leading-5 text-emerald-800/75 dark:text-emerald-200/75">
                Search by product name, generic, brand, or barcode. A matched record keeps the shared clinical data and creates only your pharmacy inventory entry.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-[var(--admin-card)] p-3">
              <Search className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
              <span className="text-xs font-medium admin-text">Find the master record</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-[var(--admin-card)] p-3">
              <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
              <span className="text-xs font-medium admin-text">Add local stock details</span>
            </div>
          </div>
        </section>

        <LibrarySearchFlow />
      </div>
    </AdminShell>
  );
}
