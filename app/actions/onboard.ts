"use server";

import { revalidatePath } from "next/cache";
import { prismaUnscoped } from "@/app/lib/db";
import {
  AuthError,
  createEmailVerification,
  createSession,
  getSessionUser,
  hashPassword,
} from "@/app/lib/auth";
import { validatePassword } from "@/app/lib/password";
import { isValidPharmacySlug, slugifyPharmacyName } from "@/app/lib/slug";
import { getRequestMeta } from "@/app/lib/request-meta";
import { emailVerificationBody, sendDelivery } from "@/app/lib/services/delivery";
import { loadOwnerSubmissionReadiness } from "@/app/lib/services/pharmacy-verification";

export type OnboardState = {
  error?: string;
  success?: string;
  pharmacyId?: string;
  slug?: string;
  field?: "name" | "slug" | "legalName" | "licenseNumber" | "city" | "phone" | "location" | "general";
};

async function requireOwnerSession() {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Sign in first", 401);
  return user;
}

function validateSlug(slug: string) {
  if (!isValidPharmacySlug(slug)) return "Use 2–48 characters: lowercase letters, numbers, and hyphens.";
  if (["admin", "portal", "platform", "login", "api", "onboard", "p"].includes(slug)) {
    return "That public URL is reserved. Pick another.";
  }
  return null;
}

export async function createPharmacyDraftAction(_prev: OnboardState, formData: FormData): Promise<OnboardState> {
  try {
    let user = await getSessionUser();
    const email = String(formData.get("email") || "").toLowerCase().trim();
    const password = String(formData.get("password") || "");
    const fullName = String(formData.get("fullName") || "").trim();
    const name = String(formData.get("name") || "").trim();
    const legalName = String(formData.get("legalName") || "").trim();
    let slug = String(formData.get("slug") || "").trim().toLowerCase();
    const licenseNumber = String(formData.get("licenseNumber") || "").trim();

    if (!name) return { error: "Enter the pharmacy trading name.", field: "name" };
    if (!slug) slug = slugifyPharmacyName(name);
    const slugError = validateSlug(slug);
    if (slugError) return { error: slugError, field: "slug" };
    if (!licenseNumber) return { error: "Enter the PPB / premises licence number to continue.", field: "licenseNumber" };

    if (!user) {
      if (!email || !password || !fullName) return { error: "Create an owner account (name, email, password) or sign in first.", field: "general" };
      const passwordError = validatePassword(password);
      if (passwordError) return { error: passwordError, field: "general" };
      const existing = await prismaUnscoped.user.findUnique({ where: { email } });
      if (existing) return { error: "That email already has an account. Sign in, then continue onboarding.", field: "general" };

      const passwordHash = await hashPassword(password);
      const created = await prismaUnscoped.user.create({
        data: {
          email,
          passwordHash,
          role: "manager",
          emailVerified: false,
          profile: { create: { fullName, phone: null } },
        },
      });
      const meta = await getRequestMeta();
      await createSession(created.id, { ip: meta.ip, userAgent: meta.userAgent });

      try {
        const verificationToken = await createEmailVerification(created.id);
        const delivery = await sendDelivery({
          channel: "email",
          purpose: "transactional",
          recipient: { email: created.email },
          subject: "Verify your email for pharmacy onboarding",
          body: emailVerificationBody(verificationToken),
        });
        if (delivery.status === "failed") {
          console.error("[onboard] verification email failed", delivery.error);
        }
      } catch (emailError) {
        console.error("[onboard] verification email setup failed", emailError);
      }

      user = await getSessionUser();
    }
    if (!user) return { error: "Could not establish a session.", field: "general" };

    const taken = await prismaUnscoped.pharmacy.findUnique({ where: { slug } });
    if (taken) return { error: "That public URL is already taken. Try a different URL.", field: "slug" };

    const pharmacy = await prismaUnscoped.pharmacy.create({
      data: {
        slug,
        name,
        legalName: legalName || name,
        licenseNumber,
        tagline: null,
        phone: null,
        email: user.email,
        city: null,
        county: null,
        status: "draft",
        listed: false,
        ownerUserId: user.id,
      },
    });

    await prismaUnscoped.pharmacyMembership.create({
      data: { pharmacyId: pharmacy.id, userId: user.id, role: "owner", status: "active", acceptedAt: new Date() },
    });

    await prismaUnscoped.pharmacySettings.create({
      data: { pharmacyId: pharmacy.id, displayName: name, phone: null, email: user.email, city: null, state: null },
    });

    await prismaUnscoped.pharmacyIntegration.create({ data: { pharmacyId: pharmacy.id } });

    await prismaUnscoped.pharmacyOnboardingEvent.create({
      data: { pharmacyId: pharmacy.id, actorId: user.id, type: "draft_created", message: "Pharmacy draft created" },
    });

    revalidatePath("/onboard");
    revalidatePath("/onboard/verification");
    return { success: "Draft saved.", pharmacyId: pharmacy.id, slug: pharmacy.slug };
  } catch (err) {
    console.error("[onboard] create draft", err);
    return { error: err instanceof Error ? err.message : "Could not save draft.", field: "general" };
  }
}

export async function updatePharmacyDraftAction(_prev: OnboardState, formData: FormData): Promise<OnboardState> {
  try {
    const user = await requireOwnerSession();
    const pharmacyId = String(formData.get("pharmacyId") || "");
    const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) return { error: "Pharmacy not found.", field: "general" };
    if (pharmacy.ownerUserId !== user.id && !user.platformAdmin) return { error: "You do not own this application.", field: "general" };
    if (!["draft", "needs_info"].includes(pharmacy.status)) return { error: "This application can no longer be edited.", field: "general" };

    const name = String(formData.get("name") || pharmacy.name).trim() || pharmacy.name;
    const legalName = String(formData.get("legalName") || pharmacy.legalName || "").trim() || name;
    const slug = String(formData.get("slug") || pharmacy.slug).trim().toLowerCase();
    const licenseNumber = String(formData.get("licenseNumber") || pharmacy.licenseNumber || "").trim();

    if (!name) return { error: "Enter the pharmacy trading name.", field: "name" };
    const slugError = validateSlug(slug);
    if (slugError) return { error: slugError, field: "slug" };
    if (!licenseNumber) return { error: "Enter the PPB / premises licence number to continue.", field: "licenseNumber" };

    if (slug !== pharmacy.slug) {
      const taken = await prismaUnscoped.pharmacy.findUnique({ where: { slug } });
      if (taken && taken.id !== pharmacy.id) return { error: "That public URL is already taken. Try a different URL.", field: "slug" };
    }

    const data = {
      slug,
      name,
      legalName,
      tagline: String(formData.get("tagline") || "").trim() || null,
      description: String(formData.get("description") || "").trim() || null,
      licenseNumber,
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
    revalidatePath("/onboard/verification");
    return { success: "Saved.", pharmacyId, slug: data.slug };
  } catch (err) {
    console.error("[onboard] update draft", err);
    return { error: err instanceof Error ? err.message : "Save failed.", field: "general" };
  }
}

export async function submitPharmacyApplicationAction(_prev: OnboardState, formData: FormData): Promise<OnboardState> {
  try {
    const user = await requireOwnerSession();
    const pharmacyId = String(formData.get("pharmacyId") || "");
    const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) return { error: "Pharmacy not found.", field: "general" };
    if (pharmacy.ownerUserId !== user.id && !user.platformAdmin) return { error: "You do not own this application.", field: "general" };
    if (!["draft", "needs_info"].includes(pharmacy.status)) {
      return { error: "This application has already been submitted or reviewed.", field: "general" };
    }

    const readiness = await loadOwnerSubmissionReadiness(pharmacyId);
    if (!readiness.ready) {
      return {
        error: `Complete pharmacy verification before submitting: ${readiness.missing.join("; ")}.`,
        field: "general",
      };
    }

    await prismaUnscoped.pharmacy.update({ where: { id: pharmacyId }, data: { status: "submitted", submittedAt: new Date() } });
    await prismaUnscoped.pharmacyOnboardingEvent.create({
      data: {
        pharmacyId,
        actorId: user.id,
        type: "submitted",
        message: "Application submitted for network review",
        meta: {
          latitude: pharmacy.latitude,
          longitude: pharmacy.longitude,
          locationSource: "browser_geolocation_or_manual_pin",
          verificationDossierComplete: true,
        },
      },
    });
    revalidatePath("/onboard");
    revalidatePath("/onboard/verification");
    revalidatePath("/platform");
    revalidatePath("/platform/applications");
    return { success: "Submitted for verification review.", pharmacyId, slug: pharmacy.slug };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Submit failed.", field: "general" };
  }
}
