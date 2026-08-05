"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface MedicationMatch {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  price: number;
  stockQty: number;
  publicListing: boolean;
  imageUrl: string | null;
  matchScore: number;
  availability: {
    status: "in_stock" | "low_stock" | "out_of_stock" | "internal_only";
    displayText: string;
    showPublicly: boolean;
  };
  note?: string;
}

interface AnalysisResult {
  identified: string | null;
  confidence: number;
  activeIngredient?: string;
  dosage?: string;
  manufacturer?: string;
  notes?: string;
}

interface SearchResponse {
  success: boolean;
  analysis: AnalysisResult;
  matches: MedicationMatch[];
  totalMatches: number;
  error?: string;
  details?: string;
}

export default function ImageSearchPanel() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a JPEG, PNG, or WebP image");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setError(null);
    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleAnalyze = useCallback(async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);

      const response = await fetch("/api/search/image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze image");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedImage]);

  const handleReset = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const getAvailabilityBadge = (status: string) => {
    switch (status) {
      case "in_stock":
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            In Stock
          </span>
        );
      case "low_stock":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
            Low Stock
          </span>
        );
      case "out_of_stock":
        return (
          <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
            Out of Stock
          </span>
        );
      case "internal_only":
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            Available Internally
          </span>
        );
      default:
        return null;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-emerald-600";
    if (confidence >= 0.6) return "text-amber-600";
    return "text-rose-600";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High Confidence";
    if (confidence >= 0.6) return "Moderate Confidence";
    if (confidence >= 0.5) return "Low Confidence";
    return "Unable to Identify";
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Upload Section */}
      {!result && (
        <div className="space-y-6">
          <div
            className={`relative rounded-3xl border-2 border-dashed transition-all duration-300 ${
              dragActive
                ? "border-[#0d6e5a] bg-[#0d6e5a]/5 scale-[1.02]"
                : "border-[#e3ebe6] bg-white hover:border-[#0d6e5a]/40"
            } ${imagePreview ? "p-4" : "p-12"}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={isAnalyzing}
            />

            {imagePreview ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#f4f7f4]">
                <Image
                  src={imagePreview}
                  alt="Uploaded medication"
                  fill
                  className="object-contain"
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleReset();
                  }}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white transition-colors z-20"
                  disabled={isAnalyzing}
                >
                  <svg
                    className="w-5 h-5 text-rose-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="mx-auto w-20 h-20 rounded-full bg-[#0d6e5a]/10 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-[#0d6e5a]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#0c1a14]">
                    Drop your medication photo here
                  </p>
                  <p className="mt-1 text-sm text-[#5a6b62]">
                    or click to browse • JPEG, PNG, WebP up to 5MB
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <Tip icon="📦">Medication packaging</Tip>
                  <Tip icon="💊">Pills or tablets</Tip>
                  <Tip icon="🏷️">Labels & boxes</Tip>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3">
              <svg
                className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-rose-800">{error}</p>
            </div>
          )}

          {imagePreview && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full py-4 px-6 rounded-2xl bg-[#0d6e5a] text-white font-semibold text-base shadow-lg shadow-[#0d6e5a]/20 hover:bg-[#084c3f] hover:shadow-xl hover:shadow-[#0d6e5a]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isAnalyzing ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Analyzing your medication...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Identify Medication
                </>
              )}
            </button>
          )}

          {/* Tips Section */}
          <div className="rounded-2xl bg-[#f4f7f4] p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0d6e5a] mb-3">
              For Best Results
            </h3>
            <ul className="space-y-2 text-sm text-[#5a6b62]">
              <li className="flex items-start gap-2">
                <span className="text-[#0d6e5a] mt-0.5">✓</span>
                Ensure good lighting and clear focus
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0d6e5a] mt-0.5">✓</span>
                Show the medication label or packaging clearly
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0d6e5a] mt-0.5">✓</span>
                Include any visible dosage information
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0d6e5a] mt-0.5">✓</span>
                For pills without packaging, show both sides if possible
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isAnalyzing && !result && (
        <div className="text-center py-16 space-y-6">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-[#e3ebe6]" />
            <div className="absolute inset-0 rounded-full border-4 border-t-[#0d6e5a] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-[#0d6e5a]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-lg font-semibold text-[#0c1a14]">
              Analyzing your medication...
            </p>
            <p className="mt-1 text-sm text-[#5a6b62]">
              Our AI is identifying the medication and checking availability
            </p>
          </div>
        </div>
      )}

      {/* Results Section */}
      {result && result.analysis && (
        <div className="space-y-8">
          {/* Analysis Summary */}
          <div className="rounded-3xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-white p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  Analysis Result
                </p>
                <h3 className="mt-2 text-2xl sm:text-3xl font-bold">
                  {result.analysis.identified || "Unable to identify"}
                </h3>
                {result.analysis.activeIngredient && (
                  <p className="mt-1 text-emerald-100">
                    Active ingredient:{" "}
                    <span className="font-semibold">
                      {result.analysis.activeIngredient}
                    </span>
                  </p>
                )}
                {result.analysis.dosage && (
                  <p className="mt-1 text-emerald-100">
                    Dosage:{" "}
                    <span className="font-semibold">
                      {result.analysis.dosage}
                    </span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <div
                  className={`text-3xl font-bold ${getConfidenceColor(
                    result.analysis.confidence
                  )} bg-white rounded-xl px-4 py-2`}
                >
                  {Math.round(result.analysis.confidence * 100)}%
                </div>
                <p className="mt-1 text-xs text-emerald-100">
                  {getConfidenceLabel(result.analysis.confidence)}
                </p>
              </div>
            </div>
            {result.analysis.notes && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm text-emerald-100">{result.analysis.notes}</p>
              </div>
            )}
          </div>

          {/* Matches */}
          {result.matches.length > 0 ? (
            <div>
              <h3 className="text-lg font-semibold text-[#0c1a14] mb-4">
                {result.matches.length} Match{result.matches.length !== 1 ? "es" : ""} Found
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {result.matches.map((match, index) => (
                  <Link
                    key={match.id}
                    href={`/medicines/${match.slug}`}
                    className="group rounded-2xl border border-[#e3ebe6] bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-[#0d6e5a]/30"
                  >
                    <div className="flex gap-4">
                      <div className="relative w-20 h-20 flex-shrink-0 rounded-xl bg-[#f4f7f4] overflow-hidden">
                        {match.imageUrl ? (
                          <Image
                            src={match.imageUrl}
                            alt={match.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-2xl">
                            💊
                          </div>
                        )}
                        {index === 0 && result.analysis.confidence >= 0.7 && (
                          <span className="absolute top-1 left-1 rounded-full bg-[#0d6e5a] px-1.5 py-0.5 text-[8px] font-bold text-white">
                            BEST MATCH
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-[#0c1a14] truncate group-hover:text-[#0d6e5a]">
                            {match.name}
                          </h4>
                          {getAvailabilityBadge(match.availability.status)}
                        </div>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#0d6e5a]">
                          {match.category.replace(/-/g, " ")}
                        </p>
                        {match.description && (
                          <p className="mt-1 text-xs text-[#5a6b62] line-clamp-2">
                            {match.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-bold text-[#0c1a14]">
                            KES {Number(match.price).toLocaleString()}
                          </span>
                          {match.matchScore > 0 && (
                            <span className="text-xs text-[#5a6b62]">
                              {Math.round(match.matchScore * 100)}% match
                            </span>
                          )}
                        </div>
                        {!match.publicListing && (
                          <p className="mt-2 text-xs text-slate-500 italic">
                            📞 Contact us for more details about this medication
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : result.analysis.confidence >= 0.5 ? (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 text-center">
              <p className="text-amber-800">
                We couldn't find an exact match in our inventory, but our team may be able to help.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full bg-[#0d6e5a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#084c3f]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Contact Us
                </Link>
                <Link
                  href="/refill"
                  className="inline-flex items-center gap-2 rounded-full border border-[#0d6e5a] px-4 py-2 text-sm font-semibold text-[#0d6e5a] hover:bg-[#0d6e5a]/5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Request Refill
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-center">
              <p className="text-rose-800">
                We couldn't identify the medication from this image. Please try uploading a clearer photo or contact our pharmacy directly.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0d6e5a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#084c3f]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Another Photo
                </button>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-[#0d6e5a] px-4 py-2 text-sm font-semibold text-[#0d6e5a] hover:bg-[#0d6e5a]/5"
                >
                  Contact Pharmacy
                </Link>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4">
            <button
              onClick={handleReset}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-2xl border border-[#e3ebe6] bg-white px-6 py-3 text-sm font-semibold text-[#0c1a14] hover:bg-[#f4f7f4]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Search Another
            </button>
            {result.matches.length > 0 && (
              <Link
                href="/portal"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0d6e5a] px-6 py-3 text-sm font-semibold text-white hover:bg-[#084c3f]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 15H4L5 9z" />
                </svg>
                Add to Cart
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Tip({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs text-[#5a6b62] shadow-sm">
      <span>{icon}</span>
      {children}
    </span>
  );
}
