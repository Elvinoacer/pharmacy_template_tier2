"use server";
import { ensureVerificationInvoice } from "@/app/lib/platform/pharmacy-enrolment";

import { revalidatePath } from "next/cache";
import { prismaUnscoped } from "@/app/lib/db";
import {
  AuthError,
  createEmailVerification,
  createSession,
  getSessionUser,
  hashPassword,
} from "@/app/lib/auth";
import { publicErrorMessage } from "@/app/lib/public-error";
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

    if (!name) return { error: "Enter the pharmacy trading name.", field: "name" };
    if (!slug) slug = slugifyPharmacyName(name);
    const slugError = validateSlug(slug);
    if (slugError) return { error: slugError, field: "slug" };

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
    if (!user) return { error: "We couldn't finish signing you in. Please sign in again and continue.", field: "general" };

    const taken = await prismaUnscoped.pharmacy.findUnique({ where: { slug } });
    if (taken) return { error: "That public URL is already taken. Try a different URL.", field: "slug" };

    const pharmacy = await prismaUnscoped.pharmacy.create({
      data: {
        slug,
        name,
        legalName: legalName || name,
        licenseNumber: null,
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
      data: {
        pharmacyId: pharmacy.id,
        actorId: user.id,
        type: "draft_created",
        message: "Pharmacy draft created; KYP verification required before premises setup and submission",
      },
    });

    revalidatePath("/onboard");
    revalidatePath("/onboard/verification");
    return { success: "Secure pharmacy profile created. Continue with Know Your Pharmacy verification.", pharmacyId: pharmacy.id, slug: pharmacy.slug };
  } catch (err) {
    console.error("[onboard] create draft", err);
    return {
      error: publicErrorMessage(
        err,
        "We couldn't create the pharmacy profile right now. Your details were not submitted. Please try again.",
      ),
      field: "general",
    };
  }
}

export async function updatePharmacyDraftAction(_prev: OnboardState, formData: FormData): Promise<OnboardState> {
  try {
    const user = await requireOwnerSession();
    const pharmacyId = String(formData.get("pharmacyId") || "");
    const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) return { error: "We couldn't find this pharmacy application. Refresh the page and try again.", field: "general" };
    if (pharmacy.ownerUserId !== user.id && !user.platformAdmin) return { error: "You do not have permission to edit this application.", field: "general" };
    if (!["draft", "needs_info"].includes(pharmacy.status)) return { error: "This application can no longer be edited.", field: "general" };

    const name = String(formData.get("name") || pharmacy.name).trim() || pharmacy.name;
    const legalName = String(formData.get("legalName") || pharmacy.legalName || "").trim() || name;
    const slug = String(formData.get("slug") || pharmacy.slug).trim().toLowerCase();
    const licenseNumber = String(formData.get("licenseNumber") || pharmacy.licenseNumber || "").trim();

    if (!name) return { error: "Enter the pharmacy trading name.", field: "name" };
    const slugError = validateSlug(slug);
    if (slugError) return { error: slugError, field: "slug" };
    if (!licenseNumber) return { error: "Complete the Know Your Pharmacy regulatory dossier before premises setup.", field: "licenseNumber" };

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
      city: pharmacy.city,
      county: pharmacy.county,
      country: pharmacy.country || "Kenya",
    };

    await prismaUnscoped.$transaction([
      prismaUnscoped.pharmacy.update({ where: { id: pharmacyId }, data }),
      prismaUnscoped.pharmacyOnboardingEvent.create({ data: { pharmacyId, actorId: user.id, type: "verification_input_changed", message: "Premises contact details updated; reviewer checks must be refreshed" } }),
    ]);
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
    return {
      error: publicErrorMessage(
        err,
        "We couldn't save these pharmacy details right now. Your previous information is unchanged. Please try again.",
      ),
      field: "general",
    };
  }
}

export async function submitPharmacyApplicationAction(_prev: OnboardState, formData: FormData): Promise<OnboardState> {
  try {
    const user = await requireOwnerSession();
    const pharmacyId = String(formData.get("pharmacyId") || "");
    const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) return { error: "We couldn't find this pharmacy application. Refresh the page and try again.", field: "general" };
    if (pharmacy.ownerUserId !== user.id && !user.platformAdmin) return { error: "You do not have permission to submit this application.", field: "general" };
    if (!["draft", "needs_info"].includes(pharmacy.status)) {
      return { error: "This application has already been submitted or reviewed.", field: "general" };
    }

    const invoice = await ensureVerificationInvoice(pharmacyId);
    if (invoice.status !== "paid") return { error: "Pay the KES 100 verification fee in Pricing & billing before submitting. Any allocated waiver is applied automatically.", field: "general" };
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
          locationSource: "browser_geolocation",
          verificationDossierComplete: true,
        },
      },
    });
    revalidatePath("/onboard");
    revalidatePath("/onboard/verification");
    revalidatePath("/platform");
    revalidatePath("/platform/applications");
    return { success: "Submitted for independent verification review.", pharmacyId, slug: pharmacy.slug };
  } catch (err) {
    console.error("[onboard] submit application", err);
    return {
      error: publicErrorMessage(
        err,
        "We couldn't submit the pharmacy application right now. Nothing was lost; please try again.",
      ),
      field: "general",
    };
  }
}
