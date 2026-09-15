import { BriefcaseBusiness, FileText, UserCheck, Users } from "lucide-react";
import { PlatformPage } from "@/app/platform/_components/PlatformPage";
import {
  getPlatformCareers,
  getPlatformCareerApplications,
} from "@/app/lib/services/platform-careers";
import CareersManager from "./CareersManager";

export const metadata = { title: "Careers & Recruitment" };
export const dynamic = "force-dynamic";

export default async function PlatformCareersPage() {
  const [allJobs, applications] = await Promise.all([
    getPlatformCareers(false),
    getPlatformCareerApplications(),
  ]);

  const activeJobs = allJobs.filter((j) => j.isActive !== false);

  return (
    <PlatformPage
      title="Platform Careers & Hiring"
      description="Create and publish job openings on the network careers portal, track roles, and review incoming candidate applications."
    >
      {/* Stat overview */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#62736a] dark:text-teal-100/60">Total Positions</span>
            <span className="rounded-xl bg-teal-50 p-2 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
              <BriefcaseBusiness className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#14221b] dark:text-white">{allJobs.length}</p>
        </div>

        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#62736a] dark:text-teal-100/60">Active Listings</span>
            <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
              <UserCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeJobs.length}</p>
        </div>

        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#62736a] dark:text-teal-100/60">Applications</span>
            <span className="rounded-xl bg-blue-50 p-2 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#14221b] dark:text-white">{applications.length}</p>
        </div>

        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#62736a] dark:text-teal-100/60">Latest Applicant</span>
            <span className="rounded-xl bg-teal-50 p-2 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
              <FileText className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-[#14221b] dark:text-white">
            {applications.length > 0
              ? `${applications[0].name} (${new Date(applications[0].createdAt).toLocaleDateString("en-GB", { month: "short", day: "numeric" })})`
              : "None yet"}
          </p>
        </div>
      </div>

      <CareersManager initialJobs={allJobs} applications={applications} />
    </PlatformPage>
  );
}
