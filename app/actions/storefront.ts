"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser, requireStaff, writeAuditLog, AuthError } from "@/app/lib/auth";
import { publicErrorMessage } from "@/app/lib/public-error";
import { getTenant } from "@/app/lib/tenant";
import { assertPharmacyWorkspaceOperable } from "@/app/lib/platform/tenant-access";
import { upsertPharmacySettings } from "@/app/lib/services/pharmacy-settings";
import { prisma } from "@/app/lib/db";

export type StorefrontActionState = {
  error?: string;
  success?: string;
};

const nullableStr = (max: number) => z.string().max(max).nullable().optional();
const nullableUrl = (max = 800) =>
  z
    .string()
    .max(max)
    .refine((v) => v === "" || v === null || /^(https?:\/\/)\S+$/i.test(v), {
      message: "Enter a valid web address starting with http:// or https://.",
    })
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use a valid hex colour such as #0f766e.")
  .nullable()
  .optional();

const quickActionKey = z.enum(["refill", "photo", "feel", "call", "whatsapp"]);

const heroSchema = z
  .object({
    kickerBadge: nullableStr(120),
    headlineStart: nullableStr(160),
    highlight: nullableStr(80),
    headlineEnd: nullableStr(40),
    subline: nullableStr(200),
    description: nullableStr(500),
    secondaryLineLabel: nullableStr(120),
  })
  .optional();

const whyChooseUsSchema = z
  .object({
    eyebrow: nullableStr(120),
    title: nullableStr(200),
    bullets: z.array(z.string().trim().min(1).max(240)).max(8).nullable().optional(),
    imageUrl: nullableUrl(),
  })
  .optional();

const sectionsSchema = z
  .object({
    services: z.boolean().nullable().optional(),
    whyChooseUs: z.boolean().nullable().optional(),
    gallery: z.boolean().nullable().optional(),
    healthTips: z.boolean().nullable().optional(),
    testimonials: z.boolean().nullable().optional(),
    insuranceStrip: z.boolean().nullable().optional(),
  })
  .optional();

const aboutSchema = z
  .object({
    storyHeading: nullableStr(240),
    closingNote: nullableStr(600),
    values: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(80),
          description: z.string().trim().min(1).max(300),
        }),
      )
      .max(8)
      .nullable()
      .optional(),
    showTeam: z.boolean().nullable().optional(),
    showGallery: z.boolean().nullable().optional(),
  })
  .optional();

const teamSchema = z
  .array(
    z.object({
      id: z.string().trim().min(1).max(60),
      name: z.string().trim().min(1).max(120),
      role: z.string().trim().max(120).default(""),
      bio: z.string().trim().max(600).default(""),
      qualifications: z.string().trim().max(240).default(""),
      photo: z
        .string()
        .max(800)
        .refine((v) => v === "" || /^(https?:\/\/)\S+$/i.test(v), {
          message: "Enter a valid photo URL starting with http:// or https://.",
        })
        .default(""),
    }),
  )
  .max(12)
  .nullable()
  .optional();

const gallerySchema = z
  .array(
    z.object({
      src: z
        .string()
        .max(800)
        .refine((v) => /^(https?:\/\/)\S+$/i.test(v), {
          message: "Each gallery photo needs a valid web address.",
        }),
      alt: z.string().trim().max(240).default(""),
      caption: z.string().trim().max(160).default(""),
    }),
  )
  .max(18)
  .nullable()
  .optional();

const faqSchema = z
  .array(
    z.object({
      category: z.string().trim().min(1).max(80),
      question: z.string().trim().min(1).max(300),
      answer: z.string().trim().min(1).max(1500),
    }),
  )
  .max(30)
  .nullable()
  .optional();

const jobsSchema = z
  .array(
    z.object({
      id: z.string().trim().min(1).max(60),
      title: z.string().trim().min(1).max(160),
      type: z.string().trim().max(60).default(""),
      location: z.string().trim().max(120).default(""),
      posted: z.string().trim().max(40).default(""),
      summary: z.string().trim().max(600).default(""),
      requirements: z.array(z.string().trim().min(1).max(240)).max(10).default([]),
    }),
  )
  .max(10)
  .nullable()
  .optional();

const ctaBannerSchema = z
  .object({
    eyebrow: nullableStr(80),
    title: nullableStr(200),
    description: nullableStr(400),
    primary: z.object({ label: nullableStr(60), href: nullableStr(160) }).optional(),
    secondary: z.object({ label: nullableStr(60), href: nullableStr(160) }).optional(),
  })
  .optional();

const socialSchema = z
  .object({
    facebook: nullableUrl(300),
    instagram: nullableUrl(300),
    linkedin: nullableUrl(300),
  })
  .optional();

const storefrontDocSchema = z
  .object({
    version: z.literal(1),
    hero: heroSchema,
    quickActions: z
      .array(
        z.object({
          key: quickActionKey,
          title: z.string().trim().min(1).max(80),
          desc: z.string().trim().max(140),
        }),
      )
      .max(5)
      .nullable()
      .optional(),
    sections: sectionsSchema,
    whyChooseUs: whyChooseUsSchema,
    team: teamSchema,
    gallery: gallerySchema,
    about: aboutSchema,
    faq: faqSchema,
    deliverySteps: z.array(z.string().trim().min(1).max(300)).max(8).nullable().optional(),
    careers: z
      .object({
        heading: nullableStr(200),
        description: nullableStr(400),
        jobs: jobsSchema,
      })
      .optional(),
    healthLibrary: z
      .object({
        eyebrow: nullableStr(120),
        title: nullableStr(200),
      })
      .optional(),
    ctaBanner: ctaBannerSchema,
    social: socialSchema,
    insurance: z.array(z.string().trim().min(1).max(120)).max(14).nullable().optional(),
    certifications: z.array(z.string().trim().min(1).max(160)).max(10).nullable().optional(),
    theme: z
      .object({
        brandPrimary: hexColor,
        brandAccent: hexColor,
      })
      .optional(),
  })
  .strict();

function pruneDoc(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(pruneDoc);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = pruneDoc(v);
      if (cleaned !== null && cleaned !== "") out[k] = cleaned;
    }
    return out;
  }
  return value;
}

function parseOptionalNumber(raw: FormDataEntryValue | null): number | null | undefined {
  const s = String(raw ?? "").trim();
  if (s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function saveStorefrontAction(
  _prev: StorefrontActionState,
  formData: FormData,
): Promise<StorefrontActionState> {
  try {
    const user = await getSessionUser();
    requireStaff(user);

    const tenant = await getTenant();
    const pharmacyId = tenant.pharmacyId;
    if (!pharmacyId || tenant.bypass) {
      return { error: "No pharmacy is selected. Choose a pharmacy workspace and try again." };
    }
    if (!user?.platformAdmin) {
      try {
        await assertPharmacyWorkspaceOperable(pharmacyId);
      } catch {
        return { error: "This pharmacy workspace is paused. Restore access before changing the storefront." };
      }
    }

    await upsertPharmacySettings({
      tagline: String(formData.get("tagline") || "").trim() || null,
      about: String(formData.get("about") || "").trim() || null,
      logoUrl: String(formData.get("logoUrl") || "").trim() || null,
      coverImageUrl: String(formData.get("coverImageUrl") || "").trim() || null,
      deliveryNotes: String(formData.get("deliveryNotes") || "").trim() || null,
      deliveryFeeKes: parseOptionalNumber(formData.get("deliveryFeeKes")) ?? null,
      deliveryRadiusKm: parseOptionalNumber(formData.get("deliveryRadiusKm")) ?? null,
      careersEmail: String(formData.get("careersEmail") || "").trim() || null,
      updatedById: user!.id,
    });

    let rawJson = String(formData.get("storefrontJson") || "{}");
    if (!rawJson.trim()) rawJson = "{}";
    let parsedUnknown: unknown;
    try {
      parsedUnknown = JSON.parse(rawJson);
    } catch {
      return { error: "We couldn't read the storefront settings. Refresh the page and try again." };
    }

    const validation = storefrontDocSchema.safeParse(parsedUnknown);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return { error: `One storefront setting needs attention: ${issue.message}` };
    }

    const pruned = pruneDoc(validation.data);
    if (!pruned || typeof pruned !== "object" || Array.isArray(pruned)) {
      return { error: "The storefront settings are incomplete. Refresh the page and try again." };
    }

    await prisma.pharmacySettings.upsert({
      where: { pharmacyId },
      create: { pharmacyId, storefront: pruned as object },
      update: { storefront: pruned as object },
    });

    await writeAuditLog(user!.id, "storefront_customized", "pharmacy_settings", pharmacyId, {
      sections: Object.keys((pruned as Record<string, unknown>) || {}),
    });

    revalidatePath("/");
    revalidatePath("/storefront");
    revalidatePath("/about");
    revalidatePath("/faq");
    revalidatePath("/delivery");
    revalidatePath("/careers");
    revalidatePath("/contact");
    revalidatePath("/admin/settings/storefront");
    revalidatePath("/admin/settings/location");

    return { success: "Storefront saved — your room updates live for every visitor." };
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: publicErrorMessage(e, "You do not have permission to change storefront settings.") };
    }
    console.error("[saveStorefront]", e);
    return { error: "We couldn't save the storefront right now. Your existing settings are unchanged. Please try again." };
  }
}
