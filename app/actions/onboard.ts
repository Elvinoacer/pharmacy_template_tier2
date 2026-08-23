"use server";

import { revalidatePath } from "next/cache";
import { prismaUnscoped } from "@/app/lib/db";
import { AuthError, createSession, hashPassword, getSessionUser } from "@/app/lib/auth";
import { validatePassword } from "@/app/lib/password";
import { isValidPharmacySlug, slugifyPharmacyName } from "@/app/lib/slug";
import { getRequestMeta } from "@/app/lib/request-meta";

export type OnboardState = { error?: string; success?: string; pharmacyId?: string; slug?: string };
export type SlugCheck = { status: "available" | "current" | "taken" | "invalid"; message: string };

const RESERVED_SLUGS = ["admin", "portal", "platform", "login", "api", "onboard", "p"];

async function requireOwnerSession() {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Sign in first", 401);
  return user;
}

export async function checkPharmacySlugAction(slugInput: string): Promise<SlugCheck> {
  const slug = slugInput.trim().toLowerCase();
  if (!isValidPharmacySlug(slug)) return { status: "invalid", message: "Use 2–48 lowercase letters, numbers, or hyphens." };
  if (RESERVED_SLUGS.includes(slug)) return { status: "taken", message: "That address is reserved. Choose another." };
  const user = await getSessionUser();
  const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { slug } });
  if (!pharmacy) return { status: "available", message: "This pharmacy address is available." };
  if (user && pharmacy.ownerUserId === user.id) return { status: "current", message: "This is your existing pharmacy address." };
  return { status: "taken", message: "That address is already in use. Choose another." };
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

    if (!name) return { error: "Enter your pharmacy trading name." };
    if (!slug) slug = slugifyPharmacyName(name);
    if (!isValidPharmacySlug(slug)) return { error: "Your public address must be 2–48 characters using lowercase letters, numbers, or hyphens." };
    if (RESERVED_SLUGS.includes(slug)) return { error: "That public address is reserved. Choose another." };

    if (!user) {
      if (!email || !password || !fullName) return { error: "Enter your name, work email and password to create the pharmacy owner account." };
      const passwordError = validatePassword(password);
      if (passwordError) return { error: passwordError };
      const existingUser = await prismaUnscoped.user.findUnique({ where: { email } });
      if (existingUser) return { error: "An account already exists with this email. Sign in to continue your pharmacy setup." };
      const passwordHash = await hashPassword(password);
      const created = await prismaUnscoped.user.create({ data: { email, passwordHash, role: "manager", emailVerified: false, profile: { create: { fullName } } } });
      const meta = await getRequestMeta();
      await createSession(created.id, { ip: meta.ip, userAgent: meta.userAgent });
      user = await getSessionUser();
    }
    if (!user) return { error: "We couldn't establish your session. Please sign in and try again." };

    const taken = await prismaUnscoped.pharmacy.findUnique({ where: { slug } });
    if (taken && taken.ownerUserId !== user.id) return { error: "That public address is already in use. Choose another address." };
    if (taken && taken.ownerUserId === user.id) {
      const pharmacy = await prismaUnscoped.pharmacy.update({ where: { id: taken.id }, data: { name, legalName: legalName || name, licenseNumber: licenseNumber || taken.licenseNumber, ppbPremisesNumber: licenseNumber || taken.ppbPremisesNumber } });
      revalidatePath("/onboard");
      return { success: "Welcome back — your pharmacy draft is ready to continue.", pharmacyId: pharmacy.id, slug: pharmacy.slug };
    }

    const pharmacy = await prismaUnscoped.pharmacy.create({
      data: {
        slug, name, legalName: legalName || name, licenseNumber: licenseNumber || null, ppbPremisesNumber: licenseNumber || null,
        status: "draft", listed: false, ownerUserId: user.id, email: user.email,
        memberships: { create: { userId: user.id, role: "owner", status: "active", acceptedAt: new Date() } },
        settings: { create: { displayName: name, email: user.email } }, integrations: { create: {} },
        onboardingEvents: { create: { actorId: user.id, type: "draft_created", message: "Pharmacy draft created" } },
      },
    );
    revalidatePath("/onboard");
    return { success: "Draft saved.", pharmacyId: pharmacy.id, slug: pharmacy.slug };
  } catch (err) {
    console.error("[onboard] create draft", err);
    return { error: err instanceof Error ? err.message : "Could not save your draft." };
  }
}

export async function updatePharmacyDraftAction(_prev: OnboardState, formData: FormData): Promise<OnboardState> {
  try {
    const user = await requireOwnerSession();
    const pharmacyId = String(formData.get("pharmacyId") || "");
    const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) return { error: "We couldn't find this pharmacy draft. Refresh and try again." };
    if (pharmacy.ownerUserId !== user.id && !user.platformAdmin) return { error: "This pharmacy belongs to another account." };
    if (!["draft", "needs_info"].includes(pharmacy.status)) return { error: "This application is already under review and can no longer be edited here." };
    const licenseNumber = String(formData.get("licenseNumber") || "").trim() || null;
    const ppbPremisesNumber = String(formData.get("ppbPremisesNumber") || "").trim() || null;
    const data = {
      name: String(formData.get("name") || pharmacy.name).trim() || pharmacy.name,
      legalName: String(formData.get("legalName") || "").trim() || pharmacy.legalName,
      tagline: String(formData.get("tagline") || "").trim() || null,
      description: String(formData.get("description") || "").trim() || null,
      licenseNumber: licenseNumber || ppbPremisesNumber,
      ppbPremisesNumber: ppbPremisesNumber || licenseNumber,
      phone: String(formData.get("phone") || "").trim() || null,
      whatsapp: String(formData.get("whatsapp") || "").trim() || null,
      email: String(formData.get("publicEmail") || "").trim() || pharmacy.email,
      city: String(formData.get("city") || "").trim() || null,
      county: String(formData.get("county") || "").trim() || null,
      country: String(formData.get("country") || "Kenya").trim() || "Kenya",
    };
    await prismaUnscoped.pharmacy.update({ where: { id: pharmacyId }, data });
    await prismaUnscoped.pharmacySettings.updateMany({ where: { pharmacyId }, data: { displayName: data.name, phone: data.phone, whatsapp: data.whatsapp, email: data.email, city: data.city, state: data.county, country: data.country } });
    revalidatePath("/onboard");
    return { success: "Saved.", pharmacyId, slug: pharmacy.slug };
  } catch (err) { return { error: err instanceof Error ? err.message : "We couldn't save those changes." }; }
}

export async function submitPharmacyApplicationAction(_prev: OnboardState, formData: FormData): Promise<OnboardState> {
  try {
    const user = await requireOwnerSession();
    const pharmacyId = String(formData.get("pharmacyId") || "");
    const pharmacy = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) return { error: "We couldn't find this application. Refresh and try again." };
    if (pharmacy.ownerUserId !== user.id && !user.platformAdmin) return { error: "This application belongs to another account." };
    const ppbNumber = pharmacy.ppbPremisesNumber || pharmacy.licenseNumber;
    if (!ppbNumber) return { error: "Add your PPB / premises licence number so our team can verify the pharmacy." };
    if (!pharmacy.city || !pharmacy.phone) return { error: "Add your city and public phone number before submitting for verification." };
    await prismaUnscoped.pharmacy.update({ where: { id: pharmacyId }, data: { status: "submitted", submittedAt: new Date(), licenseNumber: ppbNumber, ppbPremisesNumber: ppbNumber } });
    await prismaUnscoped.pharmacyOnboardingEvent.create({ data: { pharmacyId, actorId: user.id, type: "submitted", message: "Application submitted for network review" } });
    revalidatePath("/onboard"); revalidatePath("/platform");
    return { success: "Application submitted for review.", pharmacyId, slug: pharmacy.slug };
  } catch (err) { return { error: err instanceof Error ? err.message : "We couldn't submit the application." }; }
}
