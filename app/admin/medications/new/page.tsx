import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { requireMedicationWriteContext } from "@/app/lib/services/medication-access";
import { adminCreateSharedMedicationAction } from "@/app/actions/shared-medications";
import { listActiveCategoryOptions } from "@/app/lib/medication-categories";
import {
  listDosageForms,
  listRoutes,
  listPregnancyCategories,
  listManufacturers,
  listActiveIngredients,
  listClinicalTags,
} from "@/app/lib/medication-lookups";
import { AdminShell } from "@/app/components/admin/AdminShell";
import MedicationForm from "@/app/components/admin/MedicationForm";
import QuickMedicationForm from "@/app/components/admin/QuickMedicationForm";
import Link from "next/link";
import { ArrowLeft, Library, Pill, ShieldCheck, Sparkles, Zap } from "lucide-react";

export const metadata = { title: "Manual Entry — Medication" };

export default async function NewMedicationPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  try {
    await requireMedicationWriteContext(user);
  } catch {
    redirect("/admin/medications");
  }
  const params = searchParams ? await searchParams : {};
  const fullMode = params.mode === "full";

  const [categories, dosageForms] = await Promise.all([
    listActiveCategoryOptions(),
    listDosageForms(),
  ]);

  let routes: Awaited<ReturnType<typeof listRoutes>> = [];
  let pregnancyCategories: Awaited<ReturnType<typeof listPregnancyCategories>> = [];
  let manufacturers: Awaited<ReturnType<typeof listManufacturers>> = [];
  let activeIngredients: Awaited<ReturnType<typeof listActiveIngredients>> = [];
  let clinicalTags: Awaited<ReturnType<typeof listClinicalTags>> = [];

  if (fullMode) {
    [routes, pregnancyCategories, manufacturers, activeIngredients, clinicalTags] = await Promise.all([
      listRoutes(),
      listPregnancyCategories(),
      listManufacturers(),
      listActiveIngredients(),
      listClinicalTags(),
    ]);
  }

  return (
    <AdminShell
      user={user}
      title={fullMode ? "Enter full medicine details" : "Add a medicine quickly"}
      subtitle={fullMode ? "If the medicine already exists in the network library, it will be reused automatically." : "Capture the essentials now, then enrich the record whenever you have more time."}
    >
      <div className="mx-auto w-full min-w-0 max-w-4xl space-y-4 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/medications/add"
            className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--admin-border-2)] bg-[var(--admin-card)] px-3.5 text-sm font-medium admin-muted transition hover:border-[var(--admin-accent)] hover:admin-accent-text"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to acquisition chooser
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            {fullMode ? <ShieldCheck className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />} {fullMode ? "Deduplicated before save" : "Fast entry · image ready"}
          </span>
        </div>

        {!fullMode && (
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-900 dark:text-sky-100">
            <div className="flex items-start gap-2.5">
              <Library className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Fastest when you have the pack in hand</p>
                <p className="mt-0.5 text-sm leading-5 text-sky-800/80 dark:text-sky-100/75">
                  Enter the label details, snap the pack image, and continue serving the next customer. You can add the clinical and supplier details later.
                </p>
              </div>
            </div>
          </div>
        )}

        {fullMode && <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-900 dark:text-sky-100">
          <div className="flex items-start gap-2.5">
            <Library className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">One medicine record, many pharmacy inventories</p>
              <p className="mt-0.5 text-sm leading-5 text-sky-800/80 dark:text-sky-100/75">
                New medicines join the shared library after validation. Your price, stock, supplier, shelf and public visibility remain private to your pharmacy.
              </p>
            </div>
          </div>
        </div>}

        {fullMode ? <div className="relative overflow-hidden rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] shadow-xl shadow-emerald-500/5 sm:rounded-3xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 dark:from-emerald-400/10 dark:to-cyan-400/5" />

          <div className="relative border-b border-[var(--admin-border-2)] p-4 sm:p-6 lg:p-8">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 sm:h-12 sm:w-12">
                <Pill className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold admin-text sm:text-xl">Medication details</h2>
                  <span className="rounded-full bg-[var(--admin-inset)] px-2 py-1 text-sm font-bold uppercase tracking-wide admin-soft">Manual</span>
                </div>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed admin-muted sm:text-sm">
                  We check barcode and clinical identity against the shared library before creating anything new.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {["Identity", "Clinical", "Commercial", "Inventory", "Media"].map((step, index) => (
                <div
                  key={step}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-inset)] px-2.5 py-2 text-sm font-semibold admin-muted sm:text-sm"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--admin-accent-soft)] text-sm font-black admin-accent-text">
                    {index + 1}
                  </span>
                  <span className="break-words">{step}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--admin-inset)] px-3 py-2.5 text-sm leading-relaxed admin-soft">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 admin-accent-text" />
              Required and safety-critical fields come first. Possible duplicates are reviewed before a new shared record is created.
            </div>
          </div>

          <div className="relative p-3 sm:p-5 lg:p-6">
            <MedicationForm
              action={adminCreateSharedMedicationAction}
              categories={categories}
              dosageForms={dosageForms}
              routes={routes}
              pregnancyCategories={pregnancyCategories}
              manufacturers={manufacturers}
              activeIngredients={activeIngredients}
              clinicalTags={clinicalTags}
              acquisitionMethod="manual"
            />
          </div>
        </div> : <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-3 shadow-xl shadow-emerald-500/5 sm:rounded-3xl sm:p-5 lg:p-6">
          <div className="mb-4 flex items-center gap-3 border-b border-[var(--admin-border-2)] px-1 pb-4 sm:px-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold admin-text">Quick medication entry</h2>
              <p className="text-sm admin-muted">A short form for busy counter and receiving workflows.</p>
            </div>
          </div>
          <QuickMedicationForm action={adminCreateSharedMedicationAction} categories={categories} dosageForms={dosageForms} />
        </div>}
      </div>
    </AdminShell>
  );
}
