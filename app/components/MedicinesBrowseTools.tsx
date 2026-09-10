"use client";

import { useCallback, useState } from "react";
import { Camera } from "lucide-react";
import MedicinesFilterBar from "@/app/components/MedicinesFilterBar";
import MedicineImageSearch from "@/app/components/MedicineImageSearch";

/** Client shell for text filters + optional pharmacy-scoped photo search. */
export default function MedicinesBrowseTools({
  q,
  category,
  categoryOptions,
  /** @deprecated use categoryOptions */
  dbCategorySlugs,
  initialPhotoOpen = false,
  photoSearchEnabled = true,
  preserveParams,
}: {
  q?: string;
  category?: string;
  categoryOptions?: Array<{ slug: string; name: string }>;
  dbCategorySlugs?: string[];
  /** Deep-link: /medicines?photo=1 opens the snap panel when enabled. */
  initialPhotoOpen?: boolean;
  /** Network-wide browse currently uses text/category filters; photo matching stays tenant-scoped. */
  photoSearchEnabled?: boolean;
  preserveParams?: Record<string, string | undefined>;
}) {
  const [photoOpen, setPhotoOpen] = useState(photoSearchEnabled && initialPhotoOpen);

  const openPhoto = useCallback(() => {
    if (photoSearchEnabled) setPhotoOpen(true);
  }, [photoSearchEnabled]);

  const options =
    categoryOptions && categoryOptions.length > 0
      ? categoryOptions
      : (dbCategorySlugs || []).map((slug) => ({
          slug,
          name: slug.replace(/-/g, " "),
        }));

  return (
    <div>
      <MedicinesFilterBar
        q={q}
        category={category}
        categoryOptions={options}
        preserveParams={preserveParams}
        trailing={
          photoSearchEnabled ? (
            <button
              type="button"
              onClick={openPhoto}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--line-2)] bg-[var(--card)] px-3.5 py-2.5 text-xs font-semibold text-[var(--brand)] shadow-sm transition hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]"
              title="Search this pharmacy by medicine photo"
            >
              <Camera size={15} aria-hidden />
              <span className="hidden sm:inline">Photo</span>
            </button>
          ) : null
        }
      />

      {photoSearchEnabled ? (
        <div className="mt-4">
          <MedicineImageSearch open={photoOpen} onOpenChange={setPhotoOpen} />
        </div>
      ) : null}
    </div>
  );
}
