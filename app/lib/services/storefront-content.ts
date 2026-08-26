import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { prismaUnscoped } from "@/app/lib/db";
import {
  DELIVERY_BULLET_TOKEN,
  STOREFRONT_TEMPLATE,
  interpolateTokens,
  type TemplateGalleryItem,
  type TemplateSocial,
  type StorefrontTemplate,
} from "@/app/lib/storefront-template";
import {
  getResolvedPharmacyOrNull,
  type PharmacyHour,
  type ResolvedPharmacy,
} from "@/app/lib/services/pharmacy-settings";

// ── Types ─────────────────────────────────────────────────────────────────

/** Recursive partial used for the per-tenant `storefront` override document. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K] | null;
};

export type StorefrontOverrideDoc = DeepPartial<
  Omit<StorefrontTemplate, "theme">
> & {
  version?: number;
  /** Accent tints mirrored into PharmacySettings.brandPrimary/Accent columns. */
  theme?: {
    brandPrimary?: string | null;
    brandAccent?: string | null;
  } | null;
};

/**
 * Fully-resolved storefront content: template defaults filled in with this
 * pharmacy's identity, studio overrides and legacy settings columns.
 */
export type StorefrontContent = Omit<StorefrontTemplate, "theme"> & {
  theme: {
    brandPrimary: string | null;
    brandAccent: string | null;
  };
};

export type StorefrontView =
  | { status: "active"; content: StorefrontContent; resolved: ResolvedPharmacy }
  /** A `/p/{slug}` was requested explicitly, but nothing live answers to it. */
  | { status: "unavailable"; slug: string | null }
  /** No tenant in URL context — this is a network (platform) page render. */
  | { status: "none" };

// ── Merge engine ──────────────────────────────────────────────────────────

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * template ← override merge.
 * - Plain objects merge recursively.
 * - Arrays / scalars REPLACE when defined.
 * - Explicit `null` means "restore the template default".
 * - Unknown override keys are ignored; the template is the contract.
 */
export function mergeStorefrontContent<T>(base: T, override: unknown): T {
  if (override === undefined || override === null) return base;

  if (Array.isArray(base)) {
    return (Array.isArray(override) ? override : base) as unknown as T;
  }

  if (isPlainObject(base) && isPlainObject(override)) {
    const out: Record<string, unknown> = { ...base };
    for (const [key, ov] of Object.entries(override)) {
      if (!(key in base)) continue;
      out[key] = mergeStorefrontContent((base as Record<string, unknown>)[key], ov);
    }
    return out as T;
  }

  if (!isPlainObject(base)) {
    if (typeof override === typeof base) return override as T;
    return base;
  }
  return base;
}

function definedKeys(doc: StorefrontOverrideDoc | undefined): Set<string> {
  const out = new Set<string>();
  if (!doc) return out;
  for (const [k, v] of Object.entries(doc)) {
    if (v !== null && v !== undefined) out.add(k);
  }
  return out;
}

// ── Legacy dedicated-column readers (strings normalized) ──────────────────

function asStringArray(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const list = raw.map((x) => String(x ?? "").trim()).filter(Boolean);
  return list.length > 0 ? list : null;
}

type FaqItem = StorefrontTemplate["faq"][number];
type TeamMember = StorefrontTemplate["team"][number];
type GalleryItem = TemplateGalleryItem;

function asFaq(raw: unknown): FaqItem[] | null {
  if (!Array.isArray(raw)) return null;
  const list = raw
    .map((f): FaqItem | null => {
      if (!f || typeof f !== "object") return null;
      const o = f as Record<string, unknown>;
      const question = String(o.question ?? "").trim();
      const answer = String(o.answer ?? "").trim();
      if (!question || !answer) return null;
      return { category: String(o.category ?? "General").trim() || "General", question, answer };
    })
    .filter((f): f is FaqItem => Boolean(f));
  return list.length > 0 ? list : null;
}

function asTeam(raw: unknown): TeamMember[] | null {
  if (!Array.isArray(raw)) return null;
  const list = raw
    .map((m, i): TeamMember | null => {
      if (!m || typeof m !== "object") return null;
      const o = m as Record<string, unknown>;
      const name = String(o.name ?? "").trim();
      if (!name) return null;
      return {
        id: String(o.id ?? `member-${i + 1}`).trim(),
        name,
        role: String(o.role ?? "").trim(),
        bio: String(o.bio ?? "").trim(),
        qualifications: String(o.qualifications ?? "").trim(),
        photo: String(o.photo ?? "").trim(),
      };
    })
    .filter((m): m is TeamMember => Boolean(m));
  return list.length > 0 ? list : null;
}

function asGallery(raw: unknown): GalleryItem[] | null {
  if (!Array.isArray(raw)) return null;
  const list = raw
    .map((g): GalleryItem | null => {
      if (!g || typeof g !== "object") return null;
      const o = g as Record<string, unknown>;
      const src = String(o.src ?? "").trim();
      if (!src) return null;
      return {
        src,
        alt: String(o.alt ?? "").trim() || "Pharmacy photo",
        caption: String(o.caption ?? "").trim(),
      };
    })
    .filter((g): g is GalleryItem => Boolean(g));
  return list.length > 0 ? list : null;
}

function asSocial(raw: unknown): TemplateSocial | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const social: TemplateSocial = {};
  for (const key of ["facebook", "instagram", "linkedin"] as const) {
    const v = String(o[key] ?? "").trim();
    if (v.startsWith("http")) social[key] = v;
  }
  return Object.keys(social).length > 0 ? social : null;
}

// ── Content assembly for one resolved pharmacy ────────────────────────────

async function buildContent(resolved: ResolvedPharmacy): Promise<StorefrontContent> {
  let row: Awaited<
    ReturnType<typeof prismaUnscoped.pharmacySettings.findUnique>
  > = null;
  try {
    row = await prismaUnscoped.pharmacySettings.findUnique({
      where: { pharmacyId: resolved.id! },
    });
  } catch {
    // DB unavailable during build/outage — template-only rendering keeps
    // public storefront pages alive without tenant extras.
  }

  // Layer 2 — structural overrides saved by the Storefront Studio.
  let doc: StorefrontOverrideDoc | undefined;
  const raw = row?.storefront as unknown;
  if (
    raw &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    (raw as { version?: unknown }).version === 1
  ) {
    doc = raw as StorefrontOverrideDoc;
  }

  let content: StorefrontContent = {
    ...(doc
      ? (mergeStorefrontContent(
          STOREFRONT_TEMPLATE,
          doc,
        ) as unknown as Omit<StorefrontTemplate, "theme">)
      : JSON.parse(JSON.stringify(STOREFRONT_TEMPLATE)) as Omit<StorefrontTemplate, "theme">),
    // Baseline theme — filled from the settings row below.
    theme: { brandPrimary: null, brandAccent: null },
  };

  // Layer 3 — legacy dedicated columns backfill keys the doc didn't touch.
  if (row) {
    const set = definedKeys(doc);
    if (!set.has("insurance")) {
      const v = asStringArray(row.insurance);
      if (v) content = { ...content, insurance: v };
    }
    if (!set.has("certifications")) {
      const v = asStringArray(row.certifications);
      if (v) content = { ...content, certifications: v };
    }
    if (!set.has("social")) {
      const v = asSocial(row.social);
      if (v) content = { ...content, social: v };
    }
    if (!set.has("faq")) {
      const v = asFaq(row.faq);
      if (v) content = { ...content, faq: v };
    }
    if (!set.has("team")) {
      const v = asTeam(row.team);
      if (v) content = { ...content, team: v };
    }
    if (!set.has("gallery")) {
      // `gallery` never had a legacy column — kept symmetrical for clarity.
      const v = asGallery((row as { gallery?: unknown }).gallery);
      if (v) content = { ...content, gallery: v };
    }

    // Theme — overrides win, then the legacy colour columns.
    const themeDoc = doc?.theme as
      | { brandPrimary?: string | null; brandAccent?: string | null }
      | undefined;
    content.theme = {
      brandPrimary:
        themeDoc && themeDoc.brandPrimary !== undefined
          ? themeDoc.brandPrimary
          : row.brandPrimary || null,
      brandAccent:
        themeDoc && themeDoc.brandAccent !== undefined
          ? themeDoc.brandAccent
          : row.brandAccent || null,
    };
  }

  return content;
}

// ── Render helpers ────────────────────────────────────────────────────────

/** Delivery promise line replacing the `__DELIVERY__` bullet token. */
export function deliveryBullet(resolved: ResolvedPharmacy): string {
  if (resolved.deliveryRadiusKm) {
    return `Local delivery within ${resolved.deliveryRadiusKm} km`;
  }
  return "Local delivery available — ask the team";
}

/** Replace every delivery token found in a why-choose-us bullet list. */
export function resolveBullets(bullets: string[], resolved: ResolvedPharmacy): string[] {
  const deliveryLine = deliveryBullet(resolved);
  return bullets.map((b) => b.trim()).filter(Boolean).map((b) =>
    b === DELIVERY_BULLET_TOKEN ? deliveryLine : b,
  );
}

/** Interpolation context derived from the tenant profile. */
export function tokenContext(resolved: ResolvedPharmacy) {
  return {
    name: resolved.name,
    phone: resolved.phone,
    city: resolved.address.city || resolved.address.state || "",
    description:
      resolved.description ||
      resolved.tagline ||
      `Welcome to ${resolved.name}.`,
  };
}

/** Hours entry used by “Open today” style UI. */
export function primaryHours(hours: PharmacyHour[]): PharmacyHour | null {
  return hours[0] ?? null;
}

// ── Public surface ────────────────────────────────────────────────────────

/**
 * Per-request resolution of the `/p/{slug}` room. Cached across one render so
 * layout + page + components share a single resolution pass.
 *
 *   status "unavailable" → explicit slug in URL, but no live pharmacy answers.
 *   status "none"        → network-page render without an explicit tenant.
 */
export const getStorefrontView = cache(async (): Promise<StorefrontView> => {
  let urlSlug: string | null = null;
  try {
    urlSlug = (await headers()).get("x-pharmacy-slug");
  } catch {
    // No request scope (build/tooling).
  }

  const resolved = await getResolvedPharmacyOrNull();
  if (!resolved) {
    return { status: "unavailable", slug: urlSlug };
  }

  const content = await buildContent(resolved);
  const ctx = tokenContext(resolved);

  // Token interpolation pass — copy arrives ready-to-render.
  const interpolated: StorefrontContent = {
    ...content,
    hero: {
      ...content.hero,
      description: interpolateTokens(content.hero.description ?? "", ctx),
    },
    whyChooseUs: {
      ...content.whyChooseUs,
      eyebrow: interpolateTokens(content.whyChooseUs.eyebrow ?? "", ctx),
    },
    quickActions: content.quickActions.map((qa) => ({
      ...qa,
      desc: interpolateTokens(qa.desc ?? "", ctx),
    })),
  };

  return { status: "active", content: interpolated, resolved };
});
