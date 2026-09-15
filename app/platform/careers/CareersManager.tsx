"use client";

import { useState, useTransition } from "react";
import {
  BriefcaseBusiness,
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type {
  PlatformCareerJob,
  PlatformCareerApplication,
} from "@/app/lib/services/platform-careers";
import {
  createCareerAction,
  deleteCareerAction,
  toggleCareerStatusAction,
} from "@/app/actions/careers";

export default function CareersManager({
  initialJobs,
  applications,
}: {
  initialJobs: PlatformCareerJob[];
  applications: PlatformCareerApplication[];
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#14221b] dark:text-white">
            Active & Draft Openings
          </h2>
          <p className="text-xs text-[#62736a] dark:text-teal-100/60 sm:text-sm">
            Listings appear on the public <code className="rounded bg-teal-50 px-1 py-0.5 font-mono text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">/careers</code> hub.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 active:scale-95"
        >
          {isAdding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isAdding ? "Cancel" : "Add New Role"}
        </button>
      </div>

      {/* Creation form */}
      {isAdding && (
        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              try {
                await createCareerAction(formData);
                setIsAdding(false);
              } catch (err: any) {
                setError(err.message || "Failed to create career role");
              }
            });
          }}
          className="rounded-2xl border border-teal-200/60 bg-white/95 p-5 shadow-md backdrop-blur dark:border-teal-400/20 dark:bg-[#0d221c]/90 sm:p-6"
        >
          <div className="mb-4">
            <h3 className="text-base font-semibold text-[#14221b] dark:text-white">
              Create New Job Opening
            </h3>
            <p className="text-xs text-[#62736a] dark:text-teal-100/60">
              Fill in the role details. Saved jobs will appear on the public careers portal immediately.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#27382f] dark:text-teal-100/80">
                Job Title *
              </label>
              <input
                name="title"
                required
                placeholder="e.g. Senior Clinical Pharmacist"
                className="w-full rounded-xl border border-[#cfe0d6] bg-transparent px-3 py-2 text-sm text-[#14221b] placeholder:text-[#91a399] focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-teal-300/20 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#27382f] dark:text-teal-100/80">
                Department *
              </label>
              <input
                name="department"
                required
                placeholder="e.g. Clinical Operations, Retail Pharmacy"
                className="w-full rounded-xl border border-[#cfe0d6] bg-transparent px-3 py-2 text-sm text-[#14221b] placeholder:text-[#91a399] focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-teal-300/20 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#27382f] dark:text-teal-100/80">
                Employment Type
              </label>
              <select
                name="type"
                defaultValue="Full-time"
                className="w-full rounded-xl border border-[#cfe0d6] bg-transparent px-3 py-2 text-sm text-[#14221b] focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-teal-300/20 dark:text-white dark:bg-[#0d221c]"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Locum">Locum</option>
                <option value="Internship">Internship</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#27382f] dark:text-teal-100/80">
                Location
              </label>
              <input
                name="location"
                defaultValue="Nairobi, Kenya"
                className="w-full rounded-xl border border-[#cfe0d6] bg-transparent px-3 py-2 text-sm text-[#14221b] placeholder:text-[#91a399] focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-teal-300/20 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold text-[#27382f] dark:text-teal-100/80">
              Role Summary *
            </label>
            <textarea
              name="summary"
              required
              rows={3}
              placeholder="High-level description of responsibilities, mission, and day-to-day impact..."
              className="w-full rounded-xl border border-[#cfe0d6] bg-transparent px-3 py-2 text-sm text-[#14221b] placeholder:text-[#91a399] focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-teal-300/20 dark:text-white"
            />
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold text-[#27382f] dark:text-teal-100/80">
              Requirements (One per line)
            </label>
            <textarea
              name="requirements"
              rows={3}
              placeholder="B.Pharm or Diploma in Pharmacy registered with PPB&#10;2+ years in community or hospital pharmacy&#10;Excellent patient counselling skills"
              className="w-full rounded-xl border border-[#cfe0d6] bg-transparent px-3 py-2 text-sm text-[#14221b] placeholder:text-[#91a399] focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 dark:border-teal-300/20 dark:text-white font-mono text-xs"
            />
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-[#425248] transition hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-50"
            >
              {isPending ? "Saving Role…" : "Publish Job Role"}
            </button>
          </div>
        </form>
      )}

      {/* Jobs list */}
      {initialJobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cfdcd4] bg-white/70 p-10 text-center dark:border-white/15 dark:bg-white/[0.02]">
          <BriefcaseBusiness className="mx-auto h-8 w-8 text-[#7d8b83] dark:text-teal-100/40" />
          <p className="mt-2 text-sm font-semibold text-[#23332a] dark:text-white">
            No platform job listings yet
          </p>
          <p className="mt-1 text-xs text-[#68776e] dark:text-teal-100/60">
            Click &quot;Add New Role&quot; above to create your first opening.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {initialJobs.map((job) => (
            <article
              key={job.id}
              className="flex flex-col justify-between rounded-2xl border border-[#dce7e1] bg-white/90 p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-teal-400/25"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
                      {job.type}
                    </span>
                    <h3 className="mt-1.5 font-bold text-[#14221b] dark:text-white sm:text-base">
                      {job.title}
                    </h3>
                    <p className="text-xs text-[#526359] dark:text-teal-100/60">
                      {job.department} · {job.location}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      job.isActive !== false
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300"
                        : "bg-gray-100 text-gray-600 ring-1 ring-gray-400/20 dark:bg-white/5 dark:text-gray-400"
                    }`}
                  >
                    {job.isActive !== false ? "Active" : "Draft"}
                  </span>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-[#405047] dark:text-teal-50/80">
                  {job.summary}
                </p>

                {job.requirements?.length > 0 && (
                  <div className="mt-3 border-t border-[#f0f4f2] pt-2.5 dark:border-white/5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#73837a] dark:text-teal-100/50">
                      Key Requirements
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {job.requirements.slice(0, 3).map((req, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 text-xs text-[#516158] dark:text-teal-100/70"
                        >
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-teal-600 dark:text-teal-400" />
                          <span>{req}</span>
                        </li>
                      ))}
                      {job.requirements.length > 3 && (
                        <li className="text-[10px] text-[#819288] dark:text-teal-100/50">
                          +{job.requirements.length - 3} more requirements
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#f0f4f2] pt-3 text-xs dark:border-white/5">
                <span className="text-[11px] text-[#718077] dark:text-teal-100/50">
                  Posted {job.posted}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      startTransition(async () => {
                        await toggleCareerStatusAction(job.id, job.isActive === false);
                      });
                    }}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-[#38483f] transition hover:bg-gray-100 dark:border-white/10 dark:text-teal-100 dark:hover:bg-white/10"
                  >
                    {job.isActive !== false ? "Unpublish" : "Publish"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${job.title}"?`)) {
                        startTransition(async () => {
                          await deleteCareerAction(job.id);
                        });
                      }
                    }}
                    className="inline-flex items-center rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                    title="Delete role"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Applications Section */}
      <div className="pt-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[#14221b] dark:text-white">
            Candidate Applications ({applications.length})
          </h2>
          <p className="text-xs text-[#62736a] dark:text-teal-100/60 sm:text-sm">
            Applications received directly from candidates through the website careers portal.
          </p>
        </div>

        {applications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#cfdcd4] bg-white/70 p-8 text-center dark:border-white/15 dark:bg-white/[0.02]">
            <FileText className="mx-auto h-7 w-7 text-[#7d8b83] dark:text-teal-100/40" />
            <p className="mt-2 text-sm font-semibold text-[#23332a] dark:text-white">
              No candidate applications yet
            </p>
            <p className="mt-1 text-xs text-[#68776e] dark:text-teal-100/60">
              When candidates apply on <code className="rounded bg-teal-50 px-1 font-mono text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">/careers</code>, their details will be listed here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#dce7e1] bg-white/95 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-[#e5ede8] bg-[#f8faf9] text-[10px] font-bold uppercase tracking-wider text-[#57685f] dark:border-white/10 dark:bg-white/[0.02] dark:text-teal-100/70 sm:text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Role Applied</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Resume / CV</th>
                    <th className="px-4 py-3">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf3ef] text-[#293a31] dark:divide-white/5 dark:text-teal-50">
                  {applications.map((app) => (
                    <tr key={app.id} className="transition hover:bg-[#fbfdfc] dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#14221b] dark:text-white">{app.name}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#62736a] dark:text-teal-100/60">
                          <a href={`mailto:${app.email}`} className="inline-flex items-center gap-1 hover:underline">
                            <Mail className="h-3 w-3" />
                            {app.email}
                          </a>
                          <a href={`tel:${app.phone}`} className="inline-flex items-center gap-1 hover:underline">
                            <Phone className="h-3 w-3" />
                            {app.phone}
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-[#182720] dark:text-white">{app.role}</span>
                        {app.pharmacySlug && (
                          <p className="text-[11px] text-[#718177] dark:text-teal-100/60">
                            Tenant: {app.pharmacySlug}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[#62736a] dark:text-teal-100/60">
                        {new Date(app.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {app.cvFileName ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-mono text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                            <FileText className="h-3 w-3" />
                            {app.cvFileName}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-xs text-[#526258] dark:text-teal-100/70">
                        {app.message ? (
                          <p className="line-clamp-2" title={app.message}>
                            {app.message}
                          </p>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
