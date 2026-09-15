"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAction } from "@/app/lib/platform/policy";
import {
  createPlatformCareer,
  deletePlatformCareer,
  updatePlatformCareer,
} from "@/app/lib/services/platform-careers";

export async function createCareerAction(formData: FormData) {
  await requirePlatformAction(["super_admin", "support", "operator"], { stepUp: false });

  const title = String(formData.get("title") || "").trim();
  const department = String(formData.get("department") || "").trim();
  const type = String(formData.get("type") || "Full-time").trim();
  const location = String(formData.get("location") || "Nairobi, Kenya").trim();
  const summary = String(formData.get("summary") || "").trim();
  const rawRequirements = String(formData.get("requirements") || "").trim();

  if (!title || !department || !summary) {
    throw new Error("Title, department, and summary are required.");
  }

  const requirements = rawRequirements
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  await createPlatformCareer({
    title,
    department,
    type,
    location,
    summary,
    requirements: requirements.length > 0 ? requirements : ["Relevant qualifications & experience"],
    isActive: true,
  });

  revalidatePath("/careers");
  revalidatePath("/platform/careers");
}

export async function deleteCareerAction(jobId: string) {
  await requirePlatformAction(["super_admin", "support", "operator"], { stepUp: false });

  if (!jobId) throw new Error("Job ID is required");
  await deletePlatformCareer(jobId);

  revalidatePath("/careers");
  revalidatePath("/platform/careers");
}

export async function toggleCareerStatusAction(jobId: string, isActive: boolean) {
  await requirePlatformAction(["super_admin", "support", "operator"], { stepUp: false });

  if (!jobId) throw new Error("Job ID is required");
  await updatePlatformCareer(jobId, { isActive });

  revalidatePath("/careers");
  revalidatePath("/platform/careers");
}
