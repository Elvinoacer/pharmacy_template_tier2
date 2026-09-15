"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, FileImage, Trash2, UploadCloud, X } from "lucide-react";
import { portalUploadPrescriptionAction, type ActionState } from "@/app/actions/portal";
import { toast } from "@/app/components/Toaster";
import { UploadFeedback } from "@/app/components/prescription/UploadFeedback";
import {
  portalUploadFeedback,
  type UploadFeedbackModel,
} from "@/app/lib/prescription-upload-feedback";

export function PrescriptionUploadModal() {
  const fieldPrefix = useId();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<UploadFeedbackModel | null>(null);
  const [medicineName, setMedicineName] = useState("");
  const [prescriber, setPrescriber] = useState("");
  const [notes, setNotes] = useState("");
  const [attachmentUrls, setAttachmentUrls] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function resetFields() {
    setMedicineName("");
    setPrescriber("");
    setNotes("");
    setAttachmentUrls("");
    setPreviewUrl(null);
    setDone(false);
    setFeedback(null);
  }

  function close() {
    setIsOpen(false);
    resetFields();
  }

  function handleFeedbackAction(id: string) {
    if (id === "retry_submit") {
      formRef.current?.requestSubmit();
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!medicineName.trim() && !attachmentUrls.trim()) {
      setFeedback(portalUploadFeedback({ code: "validation" }));
      return;
    }

    setIsPending(true);
    const formData = new FormData();
    formData.append("medicineName", medicineName);
    formData.append("prescriber", prescriber);
    formData.append("notes", notes);
    formData.append("attachmentUrls", attachmentUrls);

    let result: ActionState;
    try {
      result = await portalUploadPrescriptionAction({}, formData);
    } catch {
      setFeedback(portalUploadFeedback({ code: "upload_failed" }));
      setIsPending(false);
      return;
    } finally {
      setIsPending(false);
    }

    if (result.error) {
      const next = portalUploadFeedback({
        code: result.code || "upload_failed",
      });
      setFeedback({
        ...next,
        message: `${result.error} ${next.message}`,
      });
      toast.error(result.error);
      return;
    }

    const success = portalUploadFeedback({ code: "upload_ok" });
    setFeedback(success);
    setDone(true);
    toast.success(result.success || success.title);
    router.refresh();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setFeedback(portalUploadFeedback({ code: "invalid_file" }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback(portalUploadFeedback({ code: "invalid_file" }));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setFeedback(portalUploadFeedback({ code: "upload_failed" }));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreviewUrl(dataUrl);
      setAttachmentUrls(dataUrl);
      setFeedback(null);
    };
    reader.readAsDataURL(file);
  }

  function clearFile() {
    setPreviewUrl(null);
    setAttachmentUrls("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetFields();
          setIsOpen(true);
        }}
        className="btn-secondary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto"
      >
        <UploadCloud className="h-4 w-4" /> Upload prescription
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${fieldPrefix}-title`}
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#121c17] dark:border dark:border-[#22332a]"
          >
            <div className="flex items-center justify-between border-b border-black/5 pb-3 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <div>
                  <h3 id={`${fieldPrefix}-title`} className="text-sm font-bold text-[#0c1a14] dark:text-white">
                    {done ? "Prescription received" : "Upload New Prescription"}
                  </h3>
                  <p className="text-[11px] text-[#6b7c72] dark:text-[#8a9a90]">
                    {done
                      ? "Choose a next step below"
                      : "Our pharmacy team will review and verify it"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-full p-1 text-slate-400 hover:bg-black/5 hover:text-slate-600 dark:hover:bg-white/5"
                aria-label="Close prescription upload dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {feedback && (
              <UploadFeedback
                feedback={feedback}
                onAction={handleFeedbackAction}
              />
            )}

            {done ? (
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={close} className="btn-secondary text-xs px-4 py-2">
                  Close
                </button>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
                <div>
                  <label htmlFor={`${fieldPrefix}-medicine`} className="mb-1 block font-semibold text-[#0c1a14] dark:text-white">
                    Medication Name(s) / Description {attachmentUrls.trim() ? "" : "*"}
                  </label>
                  <input
                    id={`${fieldPrefix}-medicine`}
                    value={medicineName}
                    onChange={(event) => setMedicineName(event.target.value)}
                    placeholder="e.g. Amoxicillin 500mg, Lipitor 20mg"
                    className="input-admin w-full text-xs"
                    required={!attachmentUrls.trim()}
                  />
                  {attachmentUrls.trim() && !medicineName.trim() && (
                    <p className="mt-1 text-[11px] text-[#6b7c72] dark:text-[#8a9a90]">
                      Names are optional if the photo is attached — the pharmacist can confirm them.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor={`${fieldPrefix}-prescriber`} className="mb-1 block font-semibold text-[#0c1a14] dark:text-white">
                    Prescribing Doctor / Hospital (Optional)
                  </label>
                  <input
                    id={`${fieldPrefix}-prescriber`}
                    value={prescriber}
                    onChange={(event) => setPrescriber(event.target.value)}
                    placeholder="e.g. Dr. Mutua, Aga Khan Hospital"
                    className="input-admin w-full text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-[#0c1a14] dark:text-white">
                    Prescription Photo / File (Optional)
                  </label>
                  {previewUrl ? (
                    <div className="relative rounded-xl border border-emerald-500/30 bg-emerald-50/50 p-2.5 dark:bg-emerald-950/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileImage className="h-4 w-4 text-emerald-600" />
                          <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">Prescription file attached</span>
                        </div>
                        <button
                          type="button"
                          onClick={clearFile}
                          className="rounded-lg p-1 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/50"
                          title="Remove attached photo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {previewUrl.startsWith("data:image/") && (
                        <div className="mt-2 flex justify-center">
                          <img
                            src={previewUrl}
                            alt="Prescription preview"
                            className="max-h-36 rounded-lg object-contain border border-emerald-500/20 shadow-xs"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--line-2)] bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--brand-soft)]">
                        <Camera className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Take or choose photo</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          capture="environment"
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                      </label>
                      <p className="mt-1 text-[11px] text-[#6b7c72] dark:text-[#8a9a90]">
                        Take a photo with your camera or select an image or PDF (up to 5 MB).
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor={`${fieldPrefix}-attachments`} className="mb-1 block font-semibold text-[#0c1a14] dark:text-white">
                    Or Paste Document Link (Optional)
                  </label>
                  <textarea
                    id={`${fieldPrefix}-attachments`}
                    rows={1}
                    value={attachmentUrls.startsWith("data:") ? "(Photo file attached above)" : attachmentUrls}
                    disabled={attachmentUrls.startsWith("data:")}
                    onChange={(event) => setAttachmentUrls(event.target.value)}
                    placeholder="Paste image URL, Google Drive, or document link..."
                    className="input-admin w-full font-mono text-xs resize-y"
                  />
                </div>

                <div>
                  <label htmlFor={`${fieldPrefix}-notes`} className="mb-1 block font-semibold text-[#0c1a14] dark:text-white">
                    Patient Notes / Special Instructions
                  </label>
                  <textarea
                    id={`${fieldPrefix}-notes`}
                    rows={2}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="e.g. Requesting home delivery, prefer generic brand..."
                    className="input-admin w-full text-xs resize-y"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-black/5 pt-3 dark:border-white/10">
                  <button
                    type="button"
                    onClick={close}
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
            )}
          </div>
        </div>
      )}
    </>
  );
}
