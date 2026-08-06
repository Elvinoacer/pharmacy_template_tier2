"use client";

import { useCallback, useState } from "react";
import { Camera } from "lucide-react";
import MedicinesFilterBar from "@/app/components/MedicinesFilterBar";
import MedicineImageSearch from "@/app/components/MedicineImageSearch";

/**
 * Client shell for text filters + photo search entry points on /medicines.
 * Keeps the normal GET text search, and opens a charming image → AI → DB flow.
 */
export default function MedicinesBrowseTools({
  q,
  category,
  categoryOptions,
  /** @deprecated use categoryOptions */
  dbCategorySlugs,
  initialPhotoOpen = false,
}: {
  q?: string;
  category?: string;
  categoryOptions?: Array<{ slug: string; name: string }>;
  dbCategorySlugs?: string[];
  /** Deep-link: /medicines?photo=1 opens the snap panel. */
  initialPhotoOpen?: boolean;
}) {
  const [photoOpen, setPhotoOpen] = useState(initialPhotoOpen);

  const openPhoto = useCallback(() => {
    setPhotoOpen(true);
  }, []);

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
        trailing={
          <button
            type="button"
            onClick={openPhoto}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#0d6e5a]/25 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#0d6e5a] shadow-sm transition hover:border-[#0d6e5a]/50 hover:bg-[#e6f4ef]"
            title="Search by medicine photo"
          >
            <Camera size={15} aria-hidden />
            <span className="hidden sm:inline">Photo</span>
          </button>
        }
      />

      <div className="mt-4">
        <MedicineImageSearch open={photoOpen} onOpenChange={setPhotoOpen} />
      </div>
    </div>
  );
}
