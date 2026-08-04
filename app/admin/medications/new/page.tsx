import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { adminCreateMedicationAction } from "@/app/actions/admin";
import { listActiveCategoryOptions } from "@/app/lib/medication-categories";
import { AdminShell } from "@/app/components/admin/AdminShell";
import MedicationForm from "@/app/components/admin/MedicationForm";
import Link from "next/link";
import { ArrowLeft, Pill } from "lucide-react";

export const metadata = { title: "New Medication" };

export default async function NewMedicationPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const categories = await listActiveCategoryOptions();

  return (
    <AdminShell user={user} title="New Medication" subtitle="Add a new drug to the catalog">
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
          
          {/* Decorative background gradient */}
          <div className="pointer-events-none absolute -inset-px rounded-3xl opacity-20 transition-opacity duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-teal-500/20" />
          </div>

          <div className="relative border-b border-gray-200/50 bg-white/50 p-8 dark:border-white/5 dark:bg-black/20">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
                <Pill className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Medication Details</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Fill in the information below to add a new medication.</p>
              </div>
            </div>
          </div>
          
          <div className="relative p-8">
            <MedicationForm action={adminCreateMedicationAction} categories={categories} />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
