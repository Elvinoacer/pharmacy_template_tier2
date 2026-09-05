"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "@/app/components/Toaster";
import { Modal } from "@/app/components/Modal";
import ImageUploadField from "@/app/components/admin/ImageUploadField";
import {
  Pencil,
  Plus,
  Search,
  Trash2,
  Merge,
  Tag,
  Package,
  X,
  Loader2,
  Check,
  EyeOff,
  Eye,
  ArrowRight,
  Hash,
  Globe,
} from "lucide-react";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  brands: string[];
  tips: string[];
  publicVisible: boolean;
  sortOrder: number;
  active: boolean;
  count: number;
};

type ModalMode =
  | { type: "create" }
  | { type: "edit"; row: CategoryRow }
  | { type: "delete"; row: CategoryRow }
  | { type: "merge" }
  | null;

const PAGE_SIZE = 10;

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function apiPost(body: Record<string, unknown>) {
  const r = await fetch("/api/admin/medications/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await r.json().catch(() => ({}))) as {
    ok?: boolean;
    message?: string;
    error?: string;
    category?: CategoryRow;
    moved?: number;
    reassignTo?: string;
  };
  if (!r.ok || !data.ok) {
    throw new Error(data.message || data.error || `Request failed (${r.status})`);
  }
  return data;
}

export function CategoryManager({ initial }: { initial: CategoryRow[] }) {
  const [rows, setRows] = useState<CategoryRow[]>(initial);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [showInactive, setShowInactive] = useState(true);
  const [modal, setModal] = useState<ModalMode>(null);
  const [pending, startTransition] = useTransition();

  // Form state for create/edit
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formSlugTouched, setFormSlugTouched] = useState(false);
  const [formDescription, setFormDescription] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formBrands, setFormBrands] = useState("");
  const [formTips, setFormTips] = useState("");
  const [formPublicVisible, setFormPublicVisible] = useState(true);
  const [formActive, setFormActive] = useState(true);
  const [imageFieldKey, setImageFieldKey] = useState(0);

  // Delete / merge extras
  const [reassignTo, setReassignTo] = useState("general");
  const [mergeFromId, setMergeFromId] = useState("");
  const [mergeToId, setMergeToId] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => (showInactive ? true : r.active))
      .filter((r) => {
        if (!needle) return true;
        return (
          r.name.toLowerCase().includes(needle) ||
          r.slug.toLowerCase().includes(needle) ||
          (r.description || "").toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [rows, q, showInactive]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openCreate = () => {
    setFormName("");
    setFormSlug("");
    setFormSlugTouched(false);
    setFormDescription("");
    setFormImageUrl("");
    setFormBrands("");
    setFormTips("");
    setFormPublicVisible(true);
    setFormActive(true);
    setImageFieldKey((k) => k + 1);
    setModal({ type: "create" });
  };

  const openEdit = (row: CategoryRow) => {
    setFormName(row.name);
    setFormSlug(row.slug);
    setFormSlugTouched(true);
    setFormDescription(row.description || "");
    setFormImageUrl(row.imageUrl || "");
    setFormBrands((row.brands || []).join("\n"));
    setFormTips((row.tips || []).join("\n"));
    setFormPublicVisible(row.publicVisible ?? true);
    setFormActive(row.active);
    setImageFieldKey((k) => k + 1);
    setModal({ type: "edit", row });
  };

  const openDelete = (row: CategoryRow) => {
    const fallback =
      rows.find((r) => r.slug === "general" && r.id !== row.id)?.slug ||
      rows.find((r) => r.id !== row.id && r.active)?.slug ||
      "general";
    setReassignTo(fallback);
    setModal({ type: "delete", row });
  };

  const openMerge = () => {
    setMergeFromId("");
    setMergeToId("");
    setModal({ type: "merge" });
  };

  const onNameChange = (value: string) => {
    setFormName(value);
    if (!formSlugTouched) setFormSlug(slugify(value));
  };

  const closeModal = useCallback(() => {
    if (!pending) setModal(null);
  }, [pending]);

  function parseLines(raw: string): string[] {
    return raw
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function createCategory() {
    const name = formName.trim();
    const slug = slugify(formSlug || name);
    if (!name || !slug) {
      toast.error("Name is required.");
      return;
    }

    const brands = parseLines(formBrands);
    const tips = parseLines(formTips);
    const tempId = `temp-${Date.now()}`;
    const optimistic: CategoryRow = {
      id: tempId,
      name,
      slug,
      description: formDescription.trim() || null,
      imageUrl: formImageUrl.trim() || null,
      brands,
      tips,
      publicVisible: formPublicVisible,
      sortOrder: (rows.at(-1)?.sortOrder ?? 0) + 10,
      active: true,
      count: 0,
    };

    setRows((prev) => [...prev, optimistic]);
    setModal(null);
    setPage(1);
    setQ("");

    startTransition(async () => {
      try {
        const data = await apiPost({
          action: "create",
          name,
          slug,
          description: formDescription.trim() || null,
          imageUrl: formImageUrl.trim() || null,
          brands,
          tips,
          publicVisible: formPublicVisible,
        });
        if (data.category) {
          setRows((prev) =>
            prev.map((r) => (r.id === tempId ? { ...optimistic, ...data.category! } : r)),
          );
        }
        toast.success(`Created category "${name}".`);
      } catch (e) {
        setRows((prev) => prev.filter((r) => r.id !== tempId));
        toast.error(e instanceof Error ? e.message : "Could not create category.");
      }
    });
  }

  function updateCategory(row: CategoryRow) {
    const name = formName.trim();
    const slug = slugify(formSlug || name);
    if (!name || !slug) {
      toast.error("Name is required.");
      return;
    }

    const brands = parseLines(formBrands);
    const tips = parseLines(formTips);
    const snapshot = rows;
    const next: CategoryRow = {
      ...row,
      name,
      slug,
      description: formDescription.trim() || null,
      imageUrl: formImageUrl.trim() || null,
      brands,
      tips,
      publicVisible: formPublicVisible,
      active: formActive,
    };

    setRows((prev) => prev.map((r) => (r.id === row.id ? next : r)));
    setModal(null);

    startTransition(async () => {
      try {
        const data = await apiPost({
          action: "update",
          id: row.id,
          name,
          slug,
          description: formDescription.trim() || null,
          imageUrl: formImageUrl.trim() || null,
          brands,
          tips,
          publicVisible: formPublicVisible,
          active: formActive,
        });
        if (data.category) {
          setRows((prev) =>
            prev.map((r) => (r.id === row.id ? { ...next, ...data.category! } : r)),
          );
        }
        toast.success(`Updated "${name}".`);
      } catch (e) {
        setRows(snapshot);
        toast.error(e instanceof Error ? e.message : "Could not update category.");
      }
    });
  }

  function deleteCategory(row: CategoryRow) {
    const snapshot = rows;
    const target = reassignTo;

    setRows((prev) => {
      const without = prev.filter((r) => r.id !== row.id);
      return without.map((r) =>
        r.slug === target ? { ...r, count: r.count + row.count } : r,
      );
    });
    setModal(null);

    startTransition(async () => {
      try {
        const data = await apiPost({
          action: "delete",
          id: row.id,
          reassignTo: target,
        });
        toast.success(
          data.moved
            ? `Deleted "${row.name}" · ${data.moved} med(s) → ${data.reassignTo}.`
            : `Deleted "${row.name}".`,
        );
      } catch (e) {
        setRows(snapshot);
        toast.error(e instanceof Error ? e.message : "Could not delete category.");
      }
    });
  }

  function toggleActive(row: CategoryRow) {
    const snapshot = rows;
    const nextActive = !row.active;
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, active: nextActive } : r)),
    );

    startTransition(async () => {
      try {
        await apiPost({ action: "update", id: row.id, active: nextActive });
        toast.success(
          nextActive ? `Activated "${row.name}".` : `Deactivated "${row.name}".`,
        );
      } catch (e) {
        setRows(snapshot);
        toast.error(e instanceof Error ? e.message : "Could not update category.");
      }
    });
  }

  function mergeCategories() {
    if (!mergeFromId || !mergeToId || mergeFromId === mergeToId) {
      toast.error("Pick two different categories to merge.");
      return;
    }
    const from = rows.find((r) => r.id === mergeFromId);
    const to = rows.find((r) => r.id === mergeToId);
    if (!from || !to) return;

    const snapshot = rows;
    setRows((prev) =>
      prev
        .filter((r) => r.id !== from.id)
        .map((r) =>
          r.id === to.id ? { ...r, count: r.count + from.count } : r,
        ),
    );
    setModal(null);

    startTransition(async () => {
      try {
        const data = await apiPost({
          action: "merge",
          fromId: from.id,
          toId: to.id,
        });
        if (data.category) {
          setRows((prev) =>
            prev.map((r) => (r.id === to.id ? { ...data.category! } : r)),
          );
        }
        toast.success(
          `Merged "${from.name}" → "${to.name}"${data.moved ? ` (${data.moved} meds)` : ""}.`,
        );
      } catch (e) {
        setRows(snapshot);
        toast.error(e instanceof Error ? e.message : "Could not merge categories.");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, slug, description…"
            className="input-admin w-full pl-9 pr-9"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setPage(1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 admin-soft hover:bg-[var(--admin-inset-2)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setShowInactive((v) => !v);
            setPage(1);
          }}
          className="btn-admin-ghost inline-flex items-center gap-1.5 text-xs"
          title={showInactive ? "Hide inactive" : "Show inactive"}
        >
          {showInactive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {showInactive ? "All" : "Active only"}
        </button>

        <button
          type="button"
          onClick={openMerge}
          disabled={rows.length < 2}
          className="btn-admin-ghost inline-flex items-center gap-1.5 text-xs disabled:opacity-40"
        >
          <Merge className="h-3.5 w-3.5" /> Merge
        </button>

        <button
          type="button"
          onClick={openCreate}
          className="btn-admin inline-flex items-center gap-1.5 !rounded-xl px-3 py-2 text-xs"
        >
          <Plus className="h-3.5 w-3.5" /> New category
        </button>
      </div>

      {/* List */}
      {paged.length === 0 ? (
        <div className="admin-empty py-10">
          <span className="admin-icon-well flex h-12 w-12">
            <Tag className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold admin-text">
            {q ? "No categories match your search" : "No categories yet"}
          </p>
          <p className="mt-1 max-w-sm text-xs admin-muted">
            {q
              ? "Try a different term, or clear the search."
              : "Create your first category to organize the catalogue."}
          </p>
          {!q && (
            <button
              type="button"
              onClick={openCreate}
              className="btn-admin mt-4 inline-flex items-center gap-1.5 !rounded-xl px-3 py-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Create category
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--admin-border)] overflow-hidden rounded-2xl border border-[var(--admin-border)]">
          {paged.map((c) => (
            <li
              key={c.id}
              className={`flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-[var(--admin-inset)] ${
                !c.active ? "opacity-60" : ""
              }`}
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 admin-accent-text">
                {c.imageUrl ? (
                  <Image src={c.imageUrl} alt="" fill className="object-cover" sizes="40px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Tag className="h-4 w-4" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold admin-text">{c.name}</p>
                  {!c.active && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      Inactive
                    </span>
                  )}
                  {c.publicVisible === false && (
                    <span className="rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 text-xs font-semibold admin-muted">
                      Hidden on site
                    </span>
                  )}
                  {c.slug === "general" && (
                    <span className="rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 text-xs font-semibold admin-muted">
                      Default
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs admin-soft">
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Hash className="h-3 w-3" />
                    {c.slug}
                  </span>
                  {c.description && (
                    <span className="truncate max-w-[280px]">{c.description}</span>
                  )}
                </div>
              </div>

              <Link
                href={`/admin/medications?category=${encodeURIComponent(c.slug)}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset-2)] px-2.5 py-1 text-xs font-semibold admin-muted transition hover:text-[var(--admin-text)]"
                title="View medications in this category"
              >
                <Package className="h-3 w-3" />
                {c.count} med{c.count === 1 ? "" : "s"}
                <ArrowRight className="h-3 w-3 opacity-50" />
              </Link>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => toggleActive(c)}
                  disabled={pending || c.slug === "general"}
                  className="rounded-lg p-2 admin-soft transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)] disabled:opacity-30"
                  title={c.active ? "Deactivate" : "Activate"}
                >
                  {c.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  disabled={pending}
                  className="rounded-lg p-2 admin-soft transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => openDelete(c)}
                  disabled={pending || c.slug === "general"}
                  className="rounded-lg p-2 admin-soft transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Client pagination */}
      {total > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--admin-border)] pt-4">
          <p className="text-xs admin-muted">
            Showing{" "}
            <strong>{(currentPage - 1) * PAGE_SIZE + 1}</strong>–
            <strong>{Math.min(currentPage * PAGE_SIZE, total)}</strong> of{" "}
            <strong>{total}</strong>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-[var(--admin-inset)] px-2.5 text-xs font-semibold admin-muted transition hover:bg-[var(--admin-inset-2)] disabled:opacity-40"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - currentPage) <= 1,
              )
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`e-${i}`} className="px-1 text-xs opacity-50">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p as number)}
                    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2.5 text-xs font-semibold transition ${
                      p === currentPage
                        ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)]"
                        : "bg-[var(--admin-inset)] admin-muted hover:bg-[var(--admin-inset-2)]"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-[var(--admin-inset)] px-2.5 text-xs font-semibold admin-muted transition hover:bg-[var(--admin-inset-2)] disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {pending && (
        <p className="flex items-center gap-1.5 text-xs admin-soft">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </p>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={modal?.type === "create" || modal?.type === "edit"}
        onClose={closeModal}
        title={
          modal?.type === "edit" ? (
            <span className="inline-flex items-center gap-2">
              <Pencil className="h-4 w-4" /> Edit category
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> New category
            </span>
          )
        }
        footer={
          <>
            <button type="button" onClick={closeModal} className="btn-admin-ghost text-xs" disabled={pending}>
              Cancel
            </button>
            <button
              type="button"
              disabled={pending || !formName.trim()}
              onClick={() => {
                if (modal?.type === "edit") updateCategory(modal.row);
                else createCategory();
              }}
              className="btn-admin inline-flex items-center gap-1.5 !rounded-xl px-3 py-2 text-xs disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {modal?.type === "edit" ? "Save changes" : "Create"}
            </button>
          </>
        }
      >
        <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
          <div>
            <label className="label-admin">Display name *</label>
            <input
              value={formName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Pain Relief"
              className="input-admin"
              autoFocus
            />
          </div>
          <div>
            <label className="label-admin">Slug</label>
            <input
              value={formSlug}
              onChange={(e) => {
                setFormSlugTouched(true);
                setFormSlug(slugify(e.target.value));
              }}
              placeholder="pain-relief"
              className="input-admin font-mono text-xs"
            />
            <p className="mt-1 text-xs admin-soft">
              Stored on each medication. Renaming the slug re-tags all meds in this category.
            </p>
          </div>
          <div>
            <label className="label-admin">Public description</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              placeholder="Shown on the public medicines category page"
              className="input-admin resize-y"
            />
          </div>
          <div>
            <ImageUploadField
              key={imageFieldKey}
              name="categoryImageUrl"
              label="Category image"
              folder="categories"
              defaultValue={formImageUrl}
              onChange={(url) => setFormImageUrl(url)}
              hint="Upload an image or paste a public image URL."
            />
          </div>
          <div>
            <label className="label-admin">Featured brands (one per line)</label>
            <textarea
              value={formBrands}
              onChange={(e) => setFormBrands(e.target.value)}
              rows={2}
              placeholder="Advil&#10;Tylenol"
              className="input-admin resize-y"
            />
          </div>
          <div>
            <label className="label-admin">Pharmacist tips (one per line)</label>
            <textarea
              value={formTips}
              onChange={(e) => setFormTips(e.target.value)}
              rows={3}
              placeholder="Do not combine multiple products containing acetaminophen."
              className="input-admin resize-y"
            />
          </div>
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm admin-muted">
              <input
                type="checkbox"
                checked={formPublicVisible}
                onChange={(e) => setFormPublicVisible(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--admin-border-2)]"
              />
              <Globe className="h-3.5 w-3.5" />
              Show on public medicines page
            </label>
            {modal?.type === "edit" && (
              <label className="flex cursor-pointer items-center gap-2 text-sm admin-muted">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--admin-border-2)]"
                />
                Active in medication form dropdowns
              </label>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal
        open={modal?.type === "delete"}
        onClose={closeModal}
        title={
          <span className="inline-flex items-center gap-2 text-red-600">
            <Trash2 className="h-4 w-4" /> Delete category
          </span>
        }
        footer={
          <>
            <button type="button" onClick={closeModal} className="btn-admin-ghost text-xs" disabled={pending}>
              Cancel
            </button>
            <button
              type="button"
              disabled={pending || modal?.type !== "delete"}
              onClick={() => modal?.type === "delete" && deleteCategory(modal.row)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </button>
          </>
        }
      >
        {modal?.type === "delete" && (
          <div className="space-y-3">
            <p className="text-sm admin-muted">
              Delete <strong className="admin-text">{modal.row.name}</strong>
              <span className="font-mono text-xs admin-soft"> ({modal.row.slug})</span>?
            </p>
            {modal.row.count > 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                <p className="font-semibold">
                  {modal.row.count} medication{modal.row.count === 1 ? "" : "s"} use this category.
                </p>
                <p className="mt-1 opacity-90">They will be reassigned before deletion:</p>
                <div className="mt-2">
                  <label className="label-admin">Reassign to</label>
                  <select
                    value={reassignTo}
                    onChange={(e) => setReassignTo(e.target.value)}
                    className="input-admin"
                  >
                    {rows
                      .filter((r) => r.id !== modal.row.id)
                      .map((r) => (
                        <option key={r.id} value={r.slug}>
                          {r.name} ({r.slug})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-xs admin-soft">No medications use this category — safe to remove.</p>
            )}
          </div>
        )}
      </Modal>

      {/* Merge modal */}
      <Modal
        open={modal?.type === "merge"}
        onClose={closeModal}
        title={
          <span className="inline-flex items-center gap-2">
            <Merge className="h-4 w-4" /> Merge categories
          </span>
        }
        footer={
          <>
            <button type="button" onClick={closeModal} className="btn-admin-ghost text-xs" disabled={pending}>
              Cancel
            </button>
            <button
              type="button"
              disabled={pending || !mergeFromId || !mergeToId || mergeFromId === mergeToId}
              onClick={mergeCategories}
              className="btn-admin inline-flex items-center gap-1.5 !rounded-xl px-3 py-2 text-xs disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Merge className="h-3.5 w-3.5" />}
              Merge
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs admin-muted">
            Move all medications from one category into another, then remove the source.
          </p>
          <div>
            <label className="label-admin">From (will be deleted)</label>
            <select
              value={mergeFromId}
              onChange={(e) => setMergeFromId(e.target.value)}
              className="input-admin"
            >
              <option value="">Select…</option>
              {rows.map((r) => (
                <option key={r.id} value={r.id} disabled={r.slug === "general"}>
                  {r.name} · {r.count} meds
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-admin">Into (kept)</label>
            <select
              value={mergeToId}
              onChange={(e) => setMergeToId(e.target.value)}
              className="input-admin"
            >
              <option value="">Select…</option>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · {r.count} meds
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
