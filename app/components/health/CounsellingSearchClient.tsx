"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Pill, Sparkles, Filter, ChevronRight, ShieldCheck, ArrowRight, BookOpen } from "lucide-react";
import DigitalCounsellingCard from "./DigitalCounsellingCard";
import type { MedicationCounsellingProfile } from "@/app/lib/medication-counselling";
import {
  CURATED_COUNSELLING_PROFILES,
  generateDynamicCounsellingProfile,
} from "@/app/lib/medication-counselling";

export default function CounsellingSearchClient({
  allMedications,
}: {
  allMedications: Array<{
    slug: string;
    name: string;
    genericName: string;
    category: string;
    hasCuratedGuide: boolean;
  }>;
}) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMedSlug, setSelectedMedSlug] = useState<string>("amoxicillin");

  const categories = useMemo(() => {
    const set = new Set(allMedications.map((m) => m.category));
    return ["all", ...Array.from(set)];
  }, [allMedications]);

  const filteredMeds = useMemo(() => {
    return allMedications.filter((med) => {
      const matchesCategory = selectedCategory === "all" || med.category === selectedCategory;
      const matchesQuery =
        !query.trim() ||
        med.name.toLowerCase().includes(query.toLowerCase()) ||
        med.genericName.toLowerCase().includes(query.toLowerCase()) ||
        med.category.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [allMedications, selectedCategory, query]);

  // Active selected profile
  const activeProfile = useMemo<MedicationCounsellingProfile>(() => {
    if (CURATED_COUNSELLING_PROFILES[selectedMedSlug]) {
      return CURATED_COUNSELLING_PROFILES[selectedMedSlug];
    }
    const foundMed = allMedications.find((m) => m.slug === selectedMedSlug);
    if (foundMed) {
      return generateDynamicCounsellingProfile(
        foundMed.name,
        foundMed.genericName,
        foundMed.category
      );
    }
    return CURATED_COUNSELLING_PROFILES.amoxicillin;
  }, [selectedMedSlug, allMedications]);

  return (
    <div className="space-y-8">
      {/* Search & Filter Bar */}
      <div className="rounded-3xl border border-[var(--health-ui-border)] bg-white p-5 sm:p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-12">
          {/* Search text input */}
          <div className="relative md:col-span-8">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search medication name, active generic ingredient, or condition…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-2xl border border-[var(--health-ui-border)] bg-[#fbfdfb] py-3 pl-10 pr-4 text-xs text-[#0c1a14] focus:border-teal-700 focus:outline-hidden"
            />
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-2xl border border-[var(--health-ui-border)] bg-[#fbfdfb] py-3 px-3.5 text-xs font-semibold capitalize text-[#0c1a14] focus:border-teal-700 focus:outline-hidden"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "All Clinical Categories" : cat.replace(/-/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Click Badges for Top Medications */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--health-ui-border)] pt-4">
          <span className="text-[11px] font-bold text-[var(--health-editorial-body)]">Featured Curated Guides:</span>
          {Object.entries(CURATED_COUNSELLING_PROFILES).map(([slug, profile]) => {
            const isSelected = selectedMedSlug === slug;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => setSelectedMedSlug(slug)}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-teal-800 text-white shadow-xs font-bold"
                    : "border border-[var(--health-ui-border)] bg-white text-[#2c3e35] hover:bg-teal-50"
                }`}
              >
                {profile.brandNames[0]} ({profile.genericName})
              </button>
            );
          })}
        </div>
      </div>

      {/* Medication Directory Grid + Live Interactive Leaflet */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left list of matching medications */}
        <div className="lg:col-span-4 space-y-2">
          <div className="flex items-center justify-between px-2">
            <p className="text-xs font-bold text-[#0c1a14]">
              Select Medication ({filteredMeds.length})
            </p>
            <span className="text-[11px] text-[var(--health-editorial-body)]">Click to view 12-pillar guide</span>
          </div>

          <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
            {filteredMeds.map((med) => {
              const isSelected = selectedMedSlug === med.slug;
              return (
                <button
                  key={med.slug}
                  type="button"
                  onClick={() => setSelectedMedSlug(med.slug)}
                  className={`w-full text-left rounded-2xl p-4 transition flex items-center justify-between border ${
                    isSelected
                      ? "border-teal-700 bg-teal-50/90 shadow-xs ring-1 ring-teal-700"
                      : "border-[var(--health-ui-border)] bg-white hover:border-teal-300 hover:bg-[#f8faf9]"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-bold text-[#0c1a14]">{med.name}</p>
                      {med.hasCuratedGuide && (
                        <span className="rounded-md bg-emerald-100 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-800">
                          12-Pillar
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-[var(--health-editorial-body)]">
                      Generic: <span className="font-semibold">{med.genericName}</span>
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-[#eef5f1] px-2 py-0.5 text-[9px] font-semibold capitalize text-teal-800">
                      {med.category.replace(/-/g, " ")}
                    </span>
                  </div>

                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition ${
                      isSelected ? "text-teal-800 translate-x-0.5" : "text-[var(--muted)]"
                    }`}
                  />
                </button>
              );
            })}

            {filteredMeds.length === 0 && (
              <div className="rounded-2xl border border-[var(--health-ui-border)] bg-white p-6 text-center text-xs text-[var(--health-editorial-body)]">
                No medication found matching &quot;{query}&quot;. Try a generic name or speak with our pharmacist.
              </div>
            )}
          </div>
        </div>

        {/* Right Active 12-Pillar Leaflet */}
        <div className="lg:col-span-8">
          <DigitalCounsellingCard counselling={activeProfile} />
        </div>
      </div>
    </div>
  );
}
