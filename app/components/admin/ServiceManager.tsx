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
  const [paymentTiming, setPaymentTiming] = useState<"auto" | "before" | "after">("auto");
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
    setPaymentTiming("auto");
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
    setPaymentTiming(isPayAfter ? "after" : (row.eligibility || "").includes("[payable:before]") ? "before" : "auto");
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
        <div className="relative min-w-0 sm:col-span-2 lg:min-w-[240px] lg:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search services…"
            className="input-admin min-h-11 w-full pl-9 text-base sm:text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowInactive((v) => !v)}
          className="btn-admin-ghost inline-flex min-h-11 w-full items-center justify-center gap-2 !text-sm lg:w-auto"
        >
          {showInactive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {showInactive ? "All" : "Active only"}
        </button>
        <Link
          href="/admin/services/bookings"
          className="btn-admin-ghost inline-flex min-h-11 w-full items-center justify-center gap-2 !text-sm lg:w-auto"
        >
          <CalendarCheck className="h-3.5 w-3.5" /> Bookings
        </Link>
        <button
          type="button"
          onClick={openCreate}
          className="btn-admin inline-flex min-h-11 w-full items-center justify-center gap-2 !rounded-xl px-4 py-2 !text-sm lg:w-auto"
        >
          <Plus className="h-3.5 w-3.5" /> New service
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty py-10">
          <p className="text-sm font-semibold admin-text">No services yet</p>
          <p className="mt-1 text-sm admin-muted">
            Create services customers can browse and book on the public site.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="btn-admin mt-4 inline-flex min-h-11 items-center gap-2 !rounded-xl px-4 py-2 !text-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Create service
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((s) => (
            <li
              key={s.id}
              className={`grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-[var(--admin-border)] p-4 transition hover:bg-[var(--admin-inset)] lg:flex lg:flex-wrap ${
                !s.active ? "opacity-60" : ""
              }`}
            >
              <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--admin-inset-2)]">
                {s.imageUrl ? (
                  <Image unoptimized src={s.imageUrl} alt="" fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-lg">💊</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words text-base font-semibold admin-text">{s.title}</p>
                  {!s.active && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-sm font-semibold text-amber-600">
                      Inactive
                    </span>
                  )}
                  {!s.bookable && (
                    <span className="rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 text-sm font-semibold admin-muted">
                      Not bookable
                    </span>
                  )}
                </div>
                <p className="mt-1 break-words text-sm leading-5 admin-soft">{s.short}</p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm admin-muted">
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
              <div className="col-span-2 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end lg:ml-auto">
                <Link
                  href={`/services/${s.slug}`}
                  target="_blank"
                  aria-label={`View ${s.title} public page`}
                  className="btn-admin-ghost inline-flex min-h-11 min-w-11 items-center justify-center gap-2 !text-sm"
                  title="View public page"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => openEdit(s)}
                  className="btn-admin-ghost inline-flex min-h-11 items-center justify-center gap-2 !text-sm"
                >
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setModal({ type: "delete", row: s })}
                  aria-label={`Delete ${s.title}`}
                  className="btn-admin-ghost inline-flex min-h-11 min-w-11 items-center justify-center gap-2 !text-sm !text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Create / Edit */}
      <Modal
        open={modal?.type === "create" || modal?.type === "edit"}
        onClose={() => !pending && setModal(null)}
        maxWidth="max-w-4xl"
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
              className="btn-admin-ghost min-h-11 w-full px-4 text-sm sm:w-auto"
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="service-form"
              disabled={pending || !title.trim() || !short.trim() || !description.trim()}
              className="btn-admin inline-flex min-h-11 w-full items-center justify-center gap-2 !rounded-xl px-5 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {modal?.type === "edit" ? "Save changes" : "Create service"}
            </button>
          </>
        }
      >
        <form id="service-form" action={saveAction} className="space-y-4">
          {modal?.type === "edit" && <input type="hidden" name="id" value={modal.row.id} />}

          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)]/55 p-4 sm:p-5">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-[var(--admin-text)]">Service details</h4>
              <p className="mt-1 text-sm leading-relaxed text-[var(--admin-text-muted)]">
                Give patients a clear name and enough context to understand the service before they book.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label-admin !text-sm" htmlFor="service-title">Service name *</label>
                <input
                  id="service-title"
                  name="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!slugTouched) setSlug(slugify(e.target.value));
                  }}
                  className="input-admin min-h-11 text-base sm:text-sm"
                  placeholder="e.g. Blood pressure check"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="label-admin !text-sm" htmlFor="service-short">Short summary *</label>
                <textarea
                  id="service-short"
                  name="short"
                  value={short}
                  onChange={(e) => setShort(e.target.value)}
                  rows={2}
                  maxLength={180}
                  className="input-admin min-h-[5rem] resize-y"
                  placeholder="A quick summary patients can understand at a glance."
                  required
                />
                <p className="mt-1 text-sm text-[var(--admin-text-soft)]">
                  {short.length}/180 · Used on service cards and search results.
                </p>
              </div>

              <div>
                <label className="label-admin !text-sm" htmlFor="service-description">Full description *</label>
                <textarea
                  id="service-description"
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="input-admin min-h-[7rem] resize-y"
                  placeholder="Explain what happens, what the patient should expect, and any important preparation."
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card-2)] p-4 sm:p-5">
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-[var(--admin-text)]">Booking & pricing</h4>
                <p className="mt-1 text-sm leading-relaxed text-[var(--admin-text-muted)]">
                  Set the fee, visit duration and how customers pay.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label-admin !text-sm" htmlFor="service-price">Price (KES)</label>
                  <input
                    id="service-price"
                    name="price"
                    type="number"
                    min="0"
                    step="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Leave blank if free"
                    className="input-admin min-h-11 text-base sm:text-sm"
                  />
                </div>

                <div>
                  <label className="label-admin !text-sm" htmlFor="service-duration">Duration</label>
                  <input
                    id="service-duration"
                    name="duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 15 minutes"
                    className="input-admin min-h-11 text-base sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="label-admin !text-sm" htmlFor="service-payment-timing">Payment timing</label>
                  <select
                    id="service-payment-timing"
                    name="paymentTiming"
                    value={paymentTiming}
                    onChange={(e) => setPaymentTiming(e.target.value as "auto" | "before" | "after")}
                    className="input-admin min-h-11 text-base sm:text-sm"
                  >
                    <option value="auto">Online when available, otherwise pay at visit</option>
                    <option value="before">Require online payment before the visit</option>
                    <option value="after">Reserve now and pay at the visit</option>
                  </select>
                </div>
              </div>

              <label className="mt-4 flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-3">
                <span>
                  <span className="block text-sm font-semibold text-[var(--admin-text)]">Online booking</span>
                  <span className="mt-0.5 block text-sm text-[var(--admin-text-muted)]">
                    Let patients request this service from the public storefront.
                  </span>
                </span>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    name="bookable"
                    checked={bookable}
                    onChange={(e) => setBookable(e.target.checked)}
                    value="true"
                    className="h-5 w-5 rounded"
                  />
                </span>
              </label>
            </section>

            <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card-2)] p-4 sm:p-5">
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-[var(--admin-text)]">Service image</h4>
                <p className="mt-1 text-sm leading-relaxed text-[var(--admin-text-muted)]">
                  A clear image makes the service easier to recognise on the storefront.
                </p>
              </div>
              <ImageUploadField
                key={imageFieldKey}
                name="imageUrl"
                label="Image · Optional"
                folder="services"
                defaultValue={imageUrl}
                onChange={setImageUrl}
                hint="Upload an image or paste a public image URL."
              />
            </section>
          </div>

          <details className="group rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card-2)]">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[var(--admin-text)] outline-none transition hover:bg-[var(--admin-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--admin-accent)] sm:px-5 [&::-webkit-details-marker]:hidden">
              <span>More service details</span>
              <span className="text-sm font-medium text-[var(--admin-text-soft)]">Optional</span>
            </summary>
            <div className="grid gap-4 border-t border-[var(--admin-border)] px-4 py-4 sm:grid-cols-2 sm:px-5">
              <div className="sm:col-span-2">
                <label className="label-admin !text-sm" htmlFor="service-benefits">Benefits</label>
                <textarea
                  id="service-benefits"
                  name="benefits"
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  rows={3}
                  className="input-admin resize-y"
                  placeholder={"One benefit per line\nPersonalised counselling\nQuick in-pharmacy assessment"}
                />
              </div>

              <div>
                <label className="label-admin !text-sm" htmlFor="service-eligibility">Eligibility</label>
                <input
                  id="service-eligibility"
                  name="eligibility"
                  value={eligibility}
                  onChange={(e) => setEligibility(e.target.value)}
                  placeholder="e.g. Adults 18+"
                  className="input-admin min-h-11 text-base sm:text-sm"
                />
              </div>

              <div>
                <label className="label-admin !text-sm" htmlFor="service-slug">Public URL slug</label>
                <input
                  id="service-slug"
                  name="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                  className="input-admin min-h-11 font-mono text-base sm:text-sm"
                  placeholder="Auto-generated from service name"
                />
              </div>

              <div>
                <label className="label-admin !text-sm" htmlFor="service-icon">Icon key</label>
                <input
                  id="service-icon"
                  name="icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="pill, heart…"
                  className="input-admin min-h-11 text-base sm:text-sm"
                />
              </div>

              <div>
                <label className="label-admin !text-sm" htmlFor="service-sort-order">Sort order</label>
                <input
                  id="service-sort-order"
                  name="sortOrder"
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="input-admin min-h-11 text-base sm:text-sm"
                  placeholder="Optional"
                />
              </div>
            </div>
          </details>

          <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card-2)] px-4 py-3 sm:px-5">
            <span>
              <span className="block text-sm font-semibold text-[var(--admin-text)]">Publish on public site</span>
              <span className="mt-0.5 block text-sm leading-relaxed text-[var(--admin-text-muted)]">
                Turn this off if you want to finish preparing the service before patients can see it.
              </span>
            </span>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center">
              <input
                type="checkbox"
                name="active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                value="true"
                className="h-5 w-5 rounded"
              />
            </span>
          </label>

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
              className="btn-admin-ghost min-h-11 px-4 !text-sm"
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
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
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
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
                This service has {modal.row.bookingCount} booking
                {modal.row.bookingCount === 1 ? "" : "s"}. It will be deactivated instead of
                hard-deleted so history is preserved.
              </p>
            ) : (
              <p className="text-sm admin-soft">No bookings — safe to delete permanently.</p>
            )}
          </div>
        )}
      </Modal>

      {pending && (
        <p className="flex items-center gap-2 text-sm admin-soft">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </p>
      )}
    </div>
  );
}
