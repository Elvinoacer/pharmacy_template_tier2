"use server";

import { revalidatePath } from "next/cache";
import { prismaUnscoped } from "@/app/lib/db";
import { AuthError, createSession, hashPassword, getSessionUser } from "@/app/lib/auth";
import { validatePassword } from "@/app/lib/password";
import { isValidPharmacySlug, slugifyPharmacyName } from "@/app/lib/slug";
import { getRequestMeta } from "@/app/lib/request-meta";

export type OnboardState = { error?: string; success?: string; pharmacyId?: string; slug?: string };

async function requireOwnerSession() {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Sign in first", 401);
  return user;
}

export async function createPharmacyDraftAction(
  _prev: OnboardState,
  formData: FormData,
): Promise<OnboardState> {
  try {
    let user = await getSessionUser();
    const email = String(formData.get("email") || "").toLowerCase().trim();
    const password = String(formData.get("password") || "");
    const fullName = String(formData.get("fullName") || "").trim();
    const name = String(formData.get("name") || "").trim();
    const legalName = String(formData.get("legalName") || "").trim();
    let slug = String(formData.get("slug") || "").trim().toLowerCase();
    const ppbPremisesNumber = String(
      formData.get("ppbPremisesNumber") || formData.get("licenseNumber") || "",
    ).trim();
    const phone = String(formData.get("phone") || "").trim();
    const city = String(formData.get("city") || "").trim();
    const county = String(formData.get("county") || "").trim();
    const tagline = String(formData.get("tagline") || "").trim();

    if (!name) return { error: "Pharmacy trading name is required." };
    if (!slug) slug = slugifyPharmacyName(name);
    if (!isValidPharmacySlug(slug)) {
      return { error: "Slug must be 2–48 characters: lowercase letters, numbers, hyphens." };
    }
    if (["admin", "portal", "platform", "login", "api", "onboard", "p"].includes(slug)) {
      return { error: "That slug is reserved. Pick another." };
    }

    if (!user) {
      if (!email || !password || !fullName) {
        return { error: "Create an owner account (name, email, password) or sign in first." };
      }
      const passwordError = validatePassword(password);
      if (passwordError) return { error: passwordError };
      const existing = await prismaUnscoped.user.findUnique({ where: { email } });
      if (existing) return { error: "That email already has an account. Sign in, then continue onboarding." };

      const passwordHash = await hashPassword(password);
      const created = await prismaUnscoped.user.create({
        data: {
          email,
          passwordHash,
          role: "manager",
          emailVerified: false,
          profile: {
            create: { fullName, phone: phone || null },
          },
        },
      });
      const meta = await getRequestMeta();
      await createSession(created.id, { ip: meta.ip, userAgent: meta.userAgent });
      user = await getSessionUser();
    }
    if (!user) return { error: "Could not establish a session." };

    const taken = await prismaUnscoped.pharmacy.findUnique({ where: { slug } });
    if (taken) return { error: "That public URL is already taken." };

    const pharmacy = await prismaUnscoped.pharmacy.create({
      data: {
        slug,
        name,
        legalName: legalName || name,
        licenseNumber: ppbPremisesNumber || null,
        ppbPremisesNumber: ppbPremisesNumber || null,
        tagline: tagline || null,
        phone: phone || null,
        email: user.email,
        city: city || null,
        county: county || null,
        status: "draft",
        listed: false,
        ownerUserId: user.id,
        memberships: {
          create: {
            userId: user.id,
            role: "owner",
            status: "active",
            acceptedAt: new Date(),
          },
        },
        settings: {
          create: {
            displayName: name,
            phone: phone || null,
            email: user.email,
            city: city || null,
            state: county || null,
          },
        },
        integrations: { create: {} },
        onboardingEvents: {
          create: {
            actorId: user.id,
            type: "draft_created",
            message: "Pharmacy draft created",
          },
        },
      },
    });

    revalidatePath("/onboard");
    return { success: "Draft saved.", pharmacyId: pharmacy.id, slug: pharmacy.slug };
  } catch (err) {
    console.error("[onboard] create draft", err);
    return { error: err instanceof Error ? err.message : "Could not save draft." };
  }
}

export async function updatePharmacyDraftAction(
  _prev: OnboardState,
  formData: FormData,
): Promise<OnboardState> {
  try {
    const user = await requireOwnerSession();
    const pharmacyId = String(formData.get("pharmacyId") || "");
    const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) return { error: "Pharmacy not found." };
    if (pharmacy.ownerUserId !== user.id && !user.platformAdmin) {
      return { error: "You do not own this application." };
    }
    if (!["draft", "needs_info"].includes(pharmacy.status)) {
      return { error: "This application can no longer be edited." };
    }

    const ppbPremisesNumber = String(
      formData.get("ppbPremisesNumber") || formData.get("licenseNumber") || "",
    ).trim();
    const data = {
      name: String(formData.get("name") || pharmacy.name).trim() || pharmacy.name,
      legalName: String(formData.get("legalName") || "").trim() || pharmacy.legalName,
      tagline: String(formData.get("tagline") || "").trim() || null,
      description: String(formData.get("description") || "").trim() || null,
      licenseNumber: ppbPremisesNumber || pharmacy.licenseNumber || null,
      ppbPremisesNumber: ppbPremisesNumber || pharmacy.ppbPremisesNumber || null,
      phone: String(formData.get("phone") || "").trim() || null,
      whatsapp: String(formData.get("whatsapp") || "").trim() || null,
      email: String(formData.get("publicEmail") || "").trim() || pharmacy.email,
      city: String(formData.get("city") || "").trim() || null,
      county: String(formData.get("county") || "").trim() || null,
      country: String(formData.get("country") || "Kenya").trim() || "Kenya",
    };

    await prismaUnscoped.pharmacy.update({ where: { id: pharmacyId }, data });
    await prismaUnscoped.pharmacySettings.updateMany({
      where: { pharmacyId },
      data: {
        displayName: data.name,
        phone: data.phone,
        whatsapp: data.whatsapp,
        email: data.email,
        city: data.city,
        state: data.county,
        country: data.country,
      },
    });
    revalidatePath("/onboard");
    return { success: "Saved.", pharmacyId, slug: pharmacy.slug };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Save failed." };
  }
}

export async function submitPharmacyApplicationAction(
  _prev: OnboardState,
  formData: FormData,
): Promise<OnboardState> {
  try {
    const user = await requireOwnerSession();
    const pharmacyId = String(formData.get("pharmacyId") || "");
    const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) return { error: "Pharmacy not found." };
    if (pharmacy.ownerUserId !== user.id && !user.platformAdmin) {
      return { error: "You do not own this application." };
    }

    // Accept both fields so older drafts are not blocked by the legacy field name.
    const ppbNumber = pharmacy.ppbPremisesNumber?.trim() || pharmacy.licenseNumber?.trim() || "";
    if (!ppbNumber) {
      return { error: "Add your PPB / premises licence number before submitting." };
    }
    if (!pharmacy.city || !pharmacy.phone) {
      return { error: "City and phone are required before review." };
    }

    await prismaUnscoped.pharmacy.update({
      where: { id: pharmacyId },
      data: {
        status: "submitted",
        submittedAt: new Date(),
        ppbPremisesNumber: pharmacy.ppbPremisesNumber || pharmacy.licenseNumber,
        licenseNumber: pharmacy.licenseNumber || pharmacy.ppbPremisesNumber,
      },
    });
    await prismaUnscoped.pharmacyOnboardingEvent.create({
      data: {
        pharmacyId,
        actorId: user.id,
        type: "submitted",
        message: "Application submitted for network review",
      },
    });
    revalidatePath("/onboard");
    revalidatePath("/platform");
    return { success: "Submitted for review.", pharmacyId, slug: pharmacy.slug };
  } catch (err) {
    console.error("[onboard] submit application", err);
    return { error: err instanceof Error ? err.message : "Submit failed." };
  }
}
