"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  saveServiceAction,
  deleteServiceAction,
  type AdminServiceState,
} from "@/app/actions/admin-services";
import { toast } from "@/app/components/Toaster";
import { Modal } from "@/app/components/Modal";
import ImageUploadField from "@/app/components/admin/ImageUploadField";
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  CalendarCheck,
  Banknote,
  ExternalLink,
} from "lucide-react";

export type ServiceRow = {
  id: string;
  slug: string;
  title: string;
  short: string;
  description: string;
  benefits: string[];
  eligibility: string | null;
  duration: string | null;
  imageUrl: string | null;
  icon: string | null;
  price: number | null;
  bookable: boolean;
  active: boolean;
  sortOrder: number;
  bookingCount: number;
};

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

type ModalMode =
  | { type: "create" }
  | { type: "edit"; row: ServiceRow }
  | { type: "delete"; row: ServiceRow }
  | null;

export function ServiceManager({ initial }: { initial: ServiceRow[] }) {
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [modal, setModal] = useState<ModalMode>(null);
  const [saveState, saveAction, savePending] = useActionState(
    saveServiceAction,
    {} as AdminServiceState,
  );
  const [delState, delAction, delPending] = useActionState(
    deleteServiceAction,
    {} as AdminServiceState,
  );

  // Form fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [short, setShort] = useState("");
  const [description, setDescription] = useState("");
  const [benefits, setBenefits] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [duration, setDuration] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [icon, setIcon] = useState("");
  const [price, setPrice] = useState("");
  const [paymentTiming, setPaymentTiming] = useState<"before" | "after">("before");
  const [bookable, setBookable] = useState(true);
  const [active, setActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("");
  const [imageFieldKey, setImageFieldKey] = useState(0);

  useEffect(() => {
    if (saveState?.success) {
      toast.success(saveState.success);
      // Refresh from server-shaped optimistic data isn't perfect — reload list shape from form.
      // Parent will re-render on next navigation; for now patch local row if we can.
      setModal(null);
      // Soft reload to pick up server id/slug.
      window.location.reload();
    }
    if (saveState?.error) toast.error(saveState.error);
  }, [saveState]);

  useEffect(() => {
    if (delState?.success) {
      toast.success(delState.success);
      if (delState.serviceId) {
        setRows((prev) =>
          prev
            .map((r) =>
              r.id === delState.serviceId
                ? delState.success?.includes("deactivated")
                  ? { ...r, active: false, bookable: false }
                  : r
                : r,
            )
            .filter((r) =>
              delState.success?.includes("deactivated")
                ? true
                : r.id !== delState.serviceId,
            ),
        );
      }
      setModal(null);
    }
    if (delState?.error) toast.error(delState.error);
  }, [delState]);

  const filtered = rows
    .filter((r) => (showInactive ? true : r.active))
    .filter((r) => {
      const needle = q.trim().toLowerCase();
      if (!needle) return true;
      return (
        r.title.toLowerCase().includes(needle) ||
        r.slug.toLowerCase().includes(needle) ||
        r.short.toLowerCase().includes(needle)
      );
    });

  function openCreate() {
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setShort("");
    setDescription("");
    setBenefits("");
    setEligibility("");
    setDuration("");
    setImageUrl("");
    setIcon("");
    setPrice("");
    setPaymentTiming("before");
    setBookable(true);
    setActive(true);
    setSortOrder("");
    setImageFieldKey((k) => k + 1);
    setModal({ type: "create" });
  }

  function openEdit(row: ServiceRow) {
    setTitle(row.title);
    setSlug(row.slug);
    setSlugTouched(true);
    setShort(row.short);
    setDescription(row.description);
    setBenefits(row.benefits.join("\n"));
    const isPayAfter = (row.eligibility || "").toLowerCase().includes("[payable:after]");
    setPaymentTiming(isPayAfter ? "after" : "before");
    setEligibility((row.eligibility || "").replace(/\[payable:(?:before|after)\]/gi, "").trim());
    setDuration(row.duration || "");
    setImageUrl(row.imageUrl || "");
    setIcon(row.icon || "");
    setPrice(row.price != null ? String(row.price) : "");
    setBookable(row.bookable);
    setActive(row.active);
    setSortOrder(String(row.sortOrder));
    setImageFieldKey((k) => k + 1);
    setModal({ type: "edit", row });
  }

  const pending = savePending || delPending;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search services…"
            className="input-admin w-full pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowInactive((v) => !v)}
          className="btn-admin-ghost inline-flex items-center gap-1.5 text-xs"
        >
          {showInactive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {showInactive ? "All" : "Active only"}
        </button>
        <Link
          href="/admin/services/bookings"
          className="btn-admin-ghost inline-flex items-center gap-1.5 text-xs"
        >
          <CalendarCheck className="h-3.5 w-3.5" /> Bookings
        </Link>
        <button
          type="button"
          onClick={openCreate}
          className="btn-admin inline-flex items-center gap-1.5 !rounded-xl px-3 py-2 text-xs"
        >
          <Plus className="h-3.5 w-3.5" /> New service
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty py-10">
          <p className="text-sm font-semibold admin-text">No services yet</p>
          <p className="mt-1 text-xs admin-muted">
            Create services customers can browse and book on the public site.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="btn-admin mt-4 inline-flex items-center gap-1.5 !rounded-xl px-3 py-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Create service
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--admin-border)] overflow-hidden rounded-2xl border border-[var(--admin-border)]">
          {filtered.map((s) => (
            <li
              key={s.id}
              className={`flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-[var(--admin-inset)] ${
                !s.active ? "opacity-60" : ""
              }`}
            >
              <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--admin-inset-2)]">
                {s.imageUrl ? (
                  <Image src={s.imageUrl} alt="" fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-lg">💊</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold admin-text">{s.title}</p>
                  {!s.active && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600">
                      Inactive
                    </span>
                  )}
                  {!s.bookable && (
                    <span className="rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 text-xs font-semibold admin-muted">
                      Not bookable
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs admin-soft">{s.short}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs admin-muted">
                  <span className="font-mono">{s.slug}</span>
                  {s.price != null ? (
                    <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-700">
                      <Banknote className="h-3 w-3" /> KES {s.price.toLocaleString()}
                    </span>
                  ) : (
                    <span>No fixed price</span>
                  )}
                  <span>{s.bookingCount} booking{s.bookingCount === 1 ? "" : "s"}</span>
                </div>
              </div>
              <Link
                href={`/services/${s.slug}`}
                target="_blank"
                className="btn-admin-ghost inline-flex items-center gap-1 text-xs"
                title="View public page"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => openEdit(s)}
                className="btn-admin-ghost inline-flex items-center gap-1 text-xs"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => setModal({ type: "delete", row: s })}
                className="btn-admin-ghost inline-flex items-center gap-1 text-xs !text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Create / Edit */}
      <Modal
        open={modal?.type === "create" || modal?.type === "edit"}
        onClose={() => !pending && setModal(null)}
        title={
          modal?.type === "edit" ? (
            <span className="inline-flex items-center gap-2">
              <Pencil className="h-4 w-4" /> Edit service
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> New service
            </span>
          )
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setModal(null)}
              className="btn-admin-ghost text-xs"
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="service-form"
              disabled={pending || !title.trim() || !short.trim() || !description.trim()}
              className="btn-admin inline-flex items-center gap-1.5 !rounded-xl px-3 py-2 text-xs disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {modal?.type === "edit" ? "Save changes" : "Create"}
            </button>
          </>
        }
      >
        <form id="service-form" action={saveAction} className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          {modal?.type === "edit" && <input type="hidden" name="id" value={modal.row.id} />}
          <div>
            <label className="label-admin">Title *</label>
            <input
              name="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              className="input-admin"
              required
            />
          </div>
          <div>
            <label className="label-admin">Slug</label>
            <input
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              className="input-admin font-mono text-xs"
            />
          </div>
          <div>
            <label className="label-admin">Short blurb *</label>
            <textarea
              name="short"
              value={short}
              onChange={(e) => setShort(e.target.value)}
              rows={2}
              className="input-admin resize-y"
              required
            />
          </div>
          <div>
            <label className="label-admin">Full description *</label>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="input-admin resize-y"
              required
            />
          </div>
          <div>
            <label className="label-admin">Benefits (one per line)</label>
            <textarea
              name="benefits"
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
              rows={3}
              className="input-admin resize-y"
              placeholder="Double-check safety review&#10;Plain-language counselling"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label-admin">Eligibility</label>
              <input
                name="eligibility"
                value={eligibility}
                onChange={(e) => setEligibility(e.target.value)}
                className="input-admin"
              />
            </div>
            <div>
              <label className="label-admin">Duration</label>
              <input
                name="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="input-admin"
              />
            </div>
          </div>
          <div>
            <ImageUploadField
              key={imageFieldKey}
              name="imageUrl"
              label="Image"
              folder="services"
              defaultValue={imageUrl}
              hint="Upload to R2 or keep a relative path like /images/services/…"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label-admin">Price (KES, optional)</label>
              <input
                name="price"
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Leave blank = no fee"
                className="input-admin"
              />
              <p className="mt-1 text-xs admin-soft">
                Fixed service price in KES.
              </p>
            </div>
            <div>
              <label className="label-admin">Payment Timing</label>
              <select
                name="paymentTiming"
                value={paymentTiming}
                onChange={(e) => setPaymentTiming(e.target.value as "before" | "after")}
                className="input-admin"
              >
                <option value="before">Payable Before (Online STK)</option>
                <option value="after">Payable After (At visit)</option>
              </select>
              <p className="mt-1 text-xs admin-soft">
                When customer pays for this service.
              </p>
            </div>
            <div>
              <label className="label-admin">Icon key</label>
              <input
                name="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="pill, heart…"
                className="input-admin"
              />
            </div>
            <div>
              <label className="label-admin">Sort order</label>
              <input
                name="sortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="input-admin"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm admin-muted">
              <input
                type="checkbox"
                name="bookable"
                checked={bookable}
                onChange={(e) => setBookable(e.target.checked)}
                value="true"
                className="h-4 w-4 rounded"
              />
              Online booking enabled
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm admin-muted">
              <input
                type="checkbox"
                name="active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                value="true"
                className="h-4 w-4 rounded"
              />
              Active on public site
            </label>
          </div>
          {/* Ensure unchecked checkboxes still post as off via hidden defaults when using controlled */}
          {!bookable && <input type="hidden" name="bookable" value="false" />}
          {!active && <input type="hidden" name="active" value="false" />}
        </form>
      </Modal>

      {/* Delete */}
      <Modal
        open={modal?.type === "delete"}
        onClose={() => !pending && setModal(null)}
        title={
          <span className="inline-flex items-center gap-2 text-red-600">
            <Trash2 className="h-4 w-4" /> Delete service
          </span>
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setModal(null)}
              className="btn-admin-ghost text-xs"
              disabled={pending}
            >
              Cancel
            </button>
            <form action={delAction}>
              {modal?.type === "delete" && (
                <input type="hidden" name="id" value={modal.row.id} />
              )}
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {modal?.type === "delete" && modal.row.bookingCount > 0
                  ? "Deactivate"
                  : "Delete"}
              </button>
            </form>
          </>
        }
      >
        {modal?.type === "delete" && (
          <div className="space-y-2 text-sm admin-muted">
            <p>
              Remove <strong className="admin-text">{modal.row.title}</strong>?
            </p>
            {modal.row.bookingCount > 0 ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800">
                This service has {modal.row.bookingCount} booking
                {modal.row.bookingCount === 1 ? "" : "s"}. It will be deactivated instead of
                hard-deleted so history is preserved.
              </p>
            ) : (
              <p className="text-xs admin-soft">No bookings — safe to delete permanently.</p>
            )}
          </div>
        )}
      </Modal>

      {pending && (
        <p className="flex items-center gap-1.5 text-xs admin-soft">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </p>
      )}
    </div>
  );
}
