"use client";

import MedicationForm from "@/app/components/admin/MedicationForm";
import type { ActionState } from "@/app/actions/admin";
import type { MedicationFormDefaults } from "@/app/components/admin/MedicationForm";

type LookupOption = { id: string; value: string; slug: string };
type ManufacturerOption = { id: string; name: string };
type ActiveIngredientOption = { id: string; name: string };
type ClinicalTagOption = { id: string; name: string; slug: string };
type CategoryOption = { slug: string; name: string };

/**
 * Thin wrapper kept for backward-compat with the edit page.
 * Delegates to the new 5-section MedicationForm (Phase 2) which now accepts `defaults`.
 */
export default function MedicationFormWithDefaults({
  action,
  defaults,
  categories,
  dosageForms,
  routes,
  pregnancyCategories,
  manufacturers,
  activeIngredients,
  clinicalTags,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults: MedicationFormDefaults;
  categories?: CategoryOption[];
  dosageForms?: LookupOption[];
  routes?: LookupOption[];
  pregnancyCategories?: LookupOption[];
  manufacturers?: ManufacturerOption[];
  activeIngredients?: ActiveIngredientOption[];
  clinicalTags?: ClinicalTagOption[];
}) {
  return (
    <MedicationForm
      action={action}
      categories={categories}
      dosageForms={dosageForms}
      routes={routes}
      pregnancyCategories={pregnancyCategories}
      manufacturers={manufacturers}
      activeIngredients={activeIngredients}
      clinicalTags={clinicalTags}
      defaults={defaults}
    />
  );
}
