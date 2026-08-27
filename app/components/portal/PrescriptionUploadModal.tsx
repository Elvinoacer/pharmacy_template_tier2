"use client";

import { useState } from "react";
import { UploadCloud, X, Check, AlertCircle, FileText, Camera } from "lucide-react";
import { portalUploadPrescriptionAction } from "@/app/actions/portal";
import { toast } from "@/app/components/Toaster";
import type { ActionState } from "@/app/actions/admin";

export function PrescriptionUploadModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [medicineName, setMedicineName] = useState("");
  const [prescriber, setPrescriber] = useState("");
  const [notes, setNotes] = useState("");
  const [attachmentUrls, setAttachmentUrls] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!medicineName) {
      toast.error("Please enter the medication name or prescription description.");
      return;
    }

    setIsPending(true);
    const fd = new FormData();
    fd.append("medicineName", medicineName);
    fd.append("prescriber", prescriber);
    fd.append("notes", notes);
    fd.append("attachmentUrls", attachmentUrls);

    const res = await portalUploadPrescriptionAction({} as any, fd);
    setIsPending(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(res.success || "Prescription uploaded successfully!");
      setIsOpen(false);
      setMedicineName("");
      setPrescriber("");
      setNotes("");
      setAttachmentUrls("");
      window.location.reload();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-secondary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto"
      >
        <UploadCloud className="h-4 w-4" /> Upload prescription
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#121c17] dark:border dark:border-[#22332a]">
            <div className="flex items-center justify-between border-b border-black/5 pb-3 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0c1a14] dark:text-white">Upload New Prescription</h3>
                  <p className="text-[11px] text-[#6b7c72] dark:text-[#8a9a90]">Our pharmacy team will review and verify it</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-black/5 hover:text-slate-600 dark:hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-[#0c1a14] dark:text-white">
                  Medication Name(s) / Description *
                </label>
                <input
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                  placeholder="e.g. Amoxicillin 500mg, Lipitor 20mg"
                  className="input-admin w-full text-xs"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-[#0c1a14] dark:text-white">
                  Prescribing Doctor / Hospital (Optional)
                </label>
                <input
                  value={prescriber}
                  onChange={(e) => setPrescriber(e.target.value)}
                  placeholder="e.g. Dr. Mutua, Aga Khan Hospital"
                  className="input-admin w-full text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-[#0c1a14] dark:text-white">
                  Prescription Photo / Document Link (Optional)
                </label>
                <textarea
                  rows={2}
                  value={attachmentUrls}
                  onChange={(e) => setAttachmentUrls(e.target.value)}
                  placeholder="Paste image URL, Google Drive, or document link..."
                  className="input-admin w-full font-mono text-xs resize-y"
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-[#0c1a14] dark:text-white">
                  Patient Notes / Special Instructions
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Requesting home delivery, prefer generic brand..."
                  className="input-admin w-full text-xs resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-black/5 pt-3 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary text-xs px-4 py-2"
                >
                  {isPending ? "Submitting..." : "Submit Prescription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
