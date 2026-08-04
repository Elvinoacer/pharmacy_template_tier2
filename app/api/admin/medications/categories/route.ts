import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isStaff, writeAuditLog } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import {
  listCategoriesWithCounts,
  slugifyCategory,
  titleFromSlug,
} from "@/app/lib/medication-categories";

export const runtime = "nodejs";

const CreateBody = z.object({
  action: z.literal("create"),
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional().nullable(),
});

const UpdateBody = z.object({
  action: z.literal("update"),
  id: z.string().uuid(),
  name: z.string().min(1).max(80).optional(),
  slug: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional().nullable(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const DeleteBody = z.object({
  action: z.literal("delete"),
  id: z.string().uuid(),
  /** When meds still use this category, reassign them here (default: general). */
  reassignTo: z.string().min(1).max(80).optional(),
});

const MergeBody = z.object({
  action: z.literal("merge"),
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
});

const Body = z.discriminatedUnion("action", [
  CreateBody,
  UpdateBody,
  DeleteBody,
  MergeBody,
]);

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const categories = await listCategoriesWithCounts();
    return NextResponse.json({ ok: true, categories });
  } catch (e) {
    console.error("[categories GET]", e);
    return NextResponse.json(
      { error: "load_failed", message: "Could not load categories. Run db:migrate if the table is missing." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    switch (parsed.action) {
      case "create":
        return await handleCreate(user.id, parsed);
      case "update":
        return await handleUpdate(user.id, parsed);
      case "delete":
        return await handleDelete(user.id, parsed);
      case "merge":
        return await handleMerge(user.id, parsed);
      default:
        return NextResponse.json({ error: "unknown_action" }, { status: 400 });
    }
  } catch (e) {
    console.error("[categories POST]", e);
    const message = e instanceof Error ? e.message : "Request failed.";
    return NextResponse.json({ error: "failed", message }, { status: 400 });
  }
}

async function handleCreate(
  userId: string,
  body: z.infer<typeof CreateBody>,
) {
  const name = body.name.trim();
  const slug = slugifyCategory(body.slug || name);
  if (!slug) {
    return NextResponse.json(
      { error: "invalid_slug", message: "Name must produce a valid slug." },
      { status: 400 },
    );
  }

  const existing = await prisma.medicationCategory.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "duplicate", message: `Category "${slug}" already exists.` },
      { status: 409 },
    );
  }

  const maxSort = await prisma.medicationCategory.aggregate({ _max: { sortOrder: true } });
  const cat = await prisma.medicationCategory.create({
    data: {
      name: name || titleFromSlug(slug),
      slug,
      description: body.description?.trim() || null,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 10,
      active: true,
    },
  });

  await writeAuditLog(userId, "medication_category_created", "medication_category", cat.id, {
    slug: cat.slug,
    name: cat.name,
  });

  return NextResponse.json({
    ok: true,
    category: {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      sortOrder: cat.sortOrder,
      active: cat.active,
      count: 0,
    },
  });
}

async function handleUpdate(
  userId: string,
  body: z.infer<typeof UpdateBody>,
) {
  const current = await prisma.medicationCategory.findUnique({ where: { id: body.id } });
  if (!current) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const nextName = body.name?.trim();
  const nextSlug = body.slug ? slugifyCategory(body.slug) : undefined;

  if (nextSlug && nextSlug !== current.slug) {
    const clash = await prisma.medicationCategory.findUnique({ where: { slug: nextSlug } });
    if (clash) {
      return NextResponse.json(
        { error: "duplicate", message: `Slug "${nextSlug}" is already taken.` },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.medicationCategory.update({
      where: { id: body.id },
      data: {
        ...(nextName !== undefined ? { name: nextName } : {}),
        ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
        ...(body.description !== undefined
          ? { description: body.description?.trim() || null }
          : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      },
    });

    // Keep MedicationMaster free-text category in sync when slug changes.
    if (nextSlug && nextSlug !== current.slug) {
      await tx.medicationMaster.updateMany({
        where: { category: current.slug },
        data: { category: nextSlug },
      });
    }

    return row;
  });

  const count = await prisma.medicationMaster.count({ where: { category: updated.slug } });

  await writeAuditLog(userId, "medication_category_updated", "medication_category", updated.id, {
    from: current.slug,
    to: updated.slug,
    name: updated.name,
  });

  return NextResponse.json({
    ok: true,
    category: {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      sortOrder: updated.sortOrder,
      active: updated.active,
      count,
    },
    renamedMeds: nextSlug && nextSlug !== current.slug ? count : 0,
  });
}

async function handleDelete(
  userId: string,
  body: z.infer<typeof DeleteBody>,
) {
  const current = await prisma.medicationCategory.findUnique({ where: { id: body.id } });
  if (!current) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (current.slug === "general") {
    return NextResponse.json(
      { error: "protected", message: "The default \"general\" category cannot be deleted." },
      { status: 400 },
    );
  }

  const reassignTo = slugifyCategory(body.reassignTo || "general") || "general";
  if (reassignTo === current.slug) {
    return NextResponse.json(
      { error: "invalid_reassign", message: "Pick a different category to reassign medications to." },
      { status: 400 },
    );
  }

  const moved = await prisma.$transaction(async (tx) => {
    const result = await tx.medicationMaster.updateMany({
      where: { category: current.slug },
      data: { category: reassignTo },
    });
    await tx.medicationCategory.delete({ where: { id: current.id } });
    // Ensure reassignment target exists in registry.
    await tx.medicationCategory.upsert({
      where: { slug: reassignTo },
      create: {
        name: titleFromSlug(reassignTo),
        slug: reassignTo,
        active: true,
      },
      update: {},
    });
    return result.count;
  });

  await writeAuditLog(userId, "medication_category_deleted", "medication_category", current.id, {
    slug: current.slug,
    reassignTo,
    moved,
  });

  return NextResponse.json({ ok: true, moved, reassignTo });
}

async function handleMerge(
  userId: string,
  body: z.infer<typeof MergeBody>,
) {
  if (body.fromId === body.toId) {
    return NextResponse.json(
      { error: "same_category", message: "Pick two different categories." },
      { status: 400 },
    );
  }

  const [from, to] = await Promise.all([
    prisma.medicationCategory.findUnique({ where: { id: body.fromId } }),
    prisma.medicationCategory.findUnique({ where: { id: body.toId } }),
  ]);

  if (!from || !to) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const moved = await prisma.$transaction(async (tx) => {
    const result = await tx.medicationMaster.updateMany({
      where: { category: from.slug },
      data: { category: to.slug },
    });
    await tx.medicationCategory.delete({ where: { id: from.id } });
    return result.count;
  });

  const count = await prisma.medicationMaster.count({ where: { category: to.slug } });

  await writeAuditLog(userId, "medication_category_merged", "medication_category", to.id, {
    from: from.slug,
    to: to.slug,
    moved,
  });

  return NextResponse.json({
    ok: true,
    moved,
    category: {
      id: to.id,
      name: to.name,
      slug: to.slug,
      description: to.description,
      sortOrder: to.sortOrder,
      active: to.active,
      count,
    },
  });
}
