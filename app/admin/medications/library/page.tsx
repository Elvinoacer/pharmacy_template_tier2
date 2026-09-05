import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { AdminShell } from "@/app/components/admin/AdminShell";
import Link from "next/link";
import { ArrowLeft, Library, Plus, Check } from "lucide-react";
import { LibrarySearchFlow } from "./LibrarySearchFlow";

export const metadata = { title: "Shared Medication Library" };

export default async function LibraryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AdminShell
      user={user}
      title="Medicine library"
      subtitle="Find an existing medicine, then add your pharmacy’s price and stock details."
    >
      <div className="mb-6">
        <Link
          href="/admin/medications/add"
          className="group inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to acquisition chooser
        </Link>
      </div>

      <div className="mx-auto max-w-4xl">
        <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <Library className="h-4 w-4" /> How this works
          </p>
          <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80">
            Search by name, generic, brand, or barcode. Found = add to your pharmacy (creates a PharmacyInventory row, no new MedicationMaster). Not found = try AI Import, CSV Import, or Manual Entry.
          </p>
        </div>

        <LibrarySearchFlow />
      </div>
    </AdminShell>
  );
}
