import "server-only";

import { prismaUnscoped } from "@/app/lib/db";

export type PlatformCareerJob = {
  id: string;
  title: string;
  department: string;
  type: string; // e.g. "Full-time", "Part-time", "Contract"
  location: string;
  posted: string;
  summary: string;
  requirements: string[];
  isActive: boolean;
  createdAt: string;
};

export type PlatformCareerApplication = {
  id: string;
  jobId?: string;
  role: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
  experience?: string;
  cvFileName?: string;
  pharmacySlug?: string;
  createdAt: string;
};

export type PlatformCareersData = {
  jobs: PlatformCareerJob[];
  applications: PlatformCareerApplication[];
};

const DEFAULT_CAREERS_DATA: PlatformCareersData = {
  jobs: [],
  applications: [],
};

export async function getPlatformCareersData(): Promise<PlatformCareersData> {
  try {
    const row = await prismaUnscoped.platformSettings.findUnique({
      where: { id: "platform" },
      select: { careersJson: true },
    });

    if (!row?.careersJson) {
      return DEFAULT_CAREERS_DATA;
    }

    const parsed = JSON.parse(row.careersJson);
    return {
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
      applications: Array.isArray(parsed.applications) ? parsed.applications : [],
    };
  } catch (err) {
    console.error("[platform-careers] Failed to load careers data:", err);
    return DEFAULT_CAREERS_DATA;
  }
}

export async function savePlatformCareersData(data: PlatformCareersData): Promise<void> {
  const json = JSON.stringify(data);
  await prismaUnscoped.platformSettings.upsert({
    where: { id: "platform" },
    create: {
      id: "platform",
      careersJson: json,
    },
    update: {
      careersJson: json,
    },
  });
}

export async function getPlatformCareers(activeOnly = true): Promise<PlatformCareerJob[]> {
  const data = await getPlatformCareersData();
  if (activeOnly) {
    return data.jobs.filter((j) => j.isActive !== false);
  }
  return data.jobs;
}

export async function getPlatformCareerApplications(): Promise<PlatformCareerApplication[]> {
  const data = await getPlatformCareersData();
  return [...data.applications].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function createPlatformCareer(input: {
  title: string;
  department: string;
  type: string;
  location: string;
  summary: string;
  requirements: string[];
  isActive?: boolean;
}): Promise<PlatformCareerJob> {
  const data = await getPlatformCareersData();
  const id = `role-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const posted = now.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  const newJob: PlatformCareerJob = {
    id,
    title: input.title.trim(),
    department: input.department.trim(),
    type: input.type.trim() || "Full-time",
    location: input.location.trim() || "Nairobi, Kenya",
    posted,
    summary: input.summary.trim(),
    requirements: input.requirements.map((r) => r.trim()).filter(Boolean),
    isActive: input.isActive ?? true,
    createdAt: now.toISOString(),
  };

  data.jobs.unshift(newJob);
  await savePlatformCareersData(data);
  return newJob;
}

export async function updatePlatformCareer(
  id: string,
  updates: Partial<Omit<PlatformCareerJob, "id" | "createdAt">>
): Promise<PlatformCareerJob | null> {
  const data = await getPlatformCareersData();
  const index = data.jobs.findIndex((j) => j.id === id);
  if (index === -1) return null;

  const updated: PlatformCareerJob = {
    ...data.jobs[index],
    ...updates,
  };
  data.jobs[index] = updated;
  await savePlatformCareersData(data);
  return updated;
}

export async function deletePlatformCareer(id: string): Promise<boolean> {
  const data = await getPlatformCareersData();
  const initialLength = data.jobs.length;
  data.jobs = data.jobs.filter((j) => j.id !== id);
  if (data.jobs.length === initialLength) return false;

  await savePlatformCareersData(data);
  return true;
}

export async function recordCareerApplication(input: {
  jobId?: string;
  role: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
  experience?: string;
  cvFileName?: string;
  pharmacySlug?: string;
}): Promise<PlatformCareerApplication> {
  const data = await getPlatformCareersData();
  const id = `app-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const newApp: PlatformCareerApplication = {
    id,
    jobId: input.jobId,
    role: input.role.trim(),
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    message: input.message?.trim(),
    experience: input.experience?.trim(),
    cvFileName: input.cvFileName?.trim(),
    pharmacySlug: input.pharmacySlug?.trim(),
    createdAt: new Date().toISOString(),
  };

  data.applications.unshift(newApp);
  await savePlatformCareersData(data);
  return newApp;
}
